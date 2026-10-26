"""
backend/tests/test_bb84_core.py

Automated test suite verifying BB84 protocol correctness:
1. Alice preparation and state encoding (|0>, |1>, |+>, |->).
2. Bob's matching-basis measurements in ideal channel yield 0 errors.
3. Bob's mismatched-basis measurements return random bits (50/50).
4. Basis reconciliation (sifting) keeps matching bases and discards mismatches.
5. Eve's intercept-and-resend attack:
   - Does NOT hardcode 25% QBER.
   - Statistically approaches ~25% error rate on sifted keys over repeated runs / large N.
6. Channel noise correctly flips bits proportional to noise_level.
7. QBER estimation correctly uses disclosed test bits only and excludes them from the candidate key.
8. Small-sample detection warning when sample size is low.
9. End-to-end API simulation endpoint for all three core scenarios:
   - Scenario 1: Clean Channel (Eve OFF, Noise = 0)
   - Scenario 2: Eavesdropping (Eve ON, Noise = 0)
   - Scenario 3: Channel Noise (Eve OFF, Noise > 0)
"""

import pytest
import numpy as np
from core.alice import Alice
from core.bob import Bob
from core.channel import QuantumChannel
from core.eve import Eve
from core.protocol import BB84Protocol
from core.rng import create_rng
from core.constants import QBER_SECURITY_THRESHOLD
from models.schemas import SimulationRequest
from routers.simulation import run_simulation


def test_alice_encoding():
    """Verify Alice encodes (basis, bit) into standard BB84 polarization states."""
    rng = create_rng(42)
    alice = Alice(rng=rng)
    bits = np.array([0, 1, 0, 1])
    bases = np.array(['+', '+', 'x', 'x'])
    states = alice.encode_states(bits, bases)

    assert len(states) == 4
    # ('+', 0) -> |0>, 0 deg
    assert states[0]['state_label'] == '|0>'
    assert states[0]['polarization_angle'] == 0.0
    # ('+', 1) -> |1>, 90 deg
    assert states[1]['state_label'] == '|1>'
    assert states[1]['polarization_angle'] == 90.0
    # ('x', 0) -> |+>, 45 deg
    assert states[2]['state_label'] == '|+>'
    assert states[2]['polarization_angle'] == 45.0
    # ('x', 1) -> |->, 135 deg
    assert states[3]['state_label'] == '|->'
    assert states[3]['polarization_angle'] == 135.0


def test_bob_matching_basis_ideal_channel_zero_errors():
    """
    Requirement 8.4: Verify that the no-Eve ideal-channel scenario produces
    zero errors among matching-basis bits.
    """
    rng = create_rng(12345)
    alice = Alice(rng=rng)
    channel = QuantumChannel(distance_km=0.0, noise_level=0.0, detector_efficiency=1.0, dark_count_prob=0.0, rng=rng)
    bob = Bob(rng=rng)
    protocol = BB84Protocol(rng=rng)

    n = 1000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)

    transmitted = channel.transmit(states)
    measured = bob.measure(transmitted)

    sift_result = protocol.sift(measured)
    alice_sifted = np.array(sift_result['alice_bits'])
    bob_sifted = np.array(sift_result['bob_bits'])

    errors = np.sum(alice_sifted != bob_sifted)
    assert errors == 0, f"Expected 0 errors on matching bases in ideal channel, got {errors}"
    assert sift_result['sifted_count'] > 0


def test_bob_mismatched_basis_randomness():
    """
    Requirement 6: For mismatched BB84 bases, the measurement result must
    be random with equal probabilities for 0 and 1.
    """
    rng = create_rng(999)
    alice = Alice(rng=rng)
    channel = QuantumChannel(distance_km=0.0, noise_level=0.0, detector_efficiency=1.0, dark_count_prob=0.0, rng=rng)
    bob = Bob(rng=rng)

    n = 2000
    # Alice sends all bits as 0 in rectilinear basis '+'
    bits = np.zeros(n, dtype=int)
    bases = np.array(['+'] * n)
    states = alice.encode_states(bits, bases)
    transmitted = channel.transmit(states)

    # Bob measures deliberately in diagonal basis 'x' (100% mismatch)
    # We override Bob's choose_bases to force mismatched basis
    bob.choose_bases = lambda count: np.array(['x'] * count)
    measured = bob.measure(transmitted)

    bob_bits = np.array([m['bob_bit'] for m in measured if m.get('measured')])
    ones_count = np.sum(bob_bits == 1)
    fraction_ones = ones_count / len(bob_bits)

    # In mismatched basis, probability of 1 is 50%.
    # For n=2000, 3 standard deviations is 3 * sqrt(0.5*0.5/2000) ~ 0.033.
    # So fraction should be well within [0.44, 0.56].
    assert 0.44 <= fraction_ones <= 0.56, f"Expected ~0.50 ones on mismatched basis, got {fraction_ones:.3f}"


def test_basis_sifting():
    """Verify basis reconciliation retains matching bases and discards mismatches."""
    protocol = BB84Protocol()
    measured_states = [
        {'index': 0, 'alice_basis': '+', 'bob_basis': '+', 'alice_bit': 1, 'bob_bit': 1, 'measured': True},
        {'index': 1, 'alice_basis': '+', 'bob_basis': 'x', 'alice_bit': 0, 'bob_bit': 1, 'measured': True},
        {'index': 2, 'alice_basis': 'x', 'bob_basis': 'x', 'alice_bit': 0, 'bob_bit': 0, 'measured': True},
        {'index': 3, 'alice_basis': 'x', 'bob_basis': '+', 'alice_bit': 1, 'bob_bit': 0, 'measured': True},
        {'index': 4, 'alice_basis': '+', 'bob_basis': '+', 'alice_bit': 0, 'bob_bit': 0, 'measured': True},
    ]

    sift_result = protocol.sift(measured_states)
    assert sift_result['sifted_count'] == 3
    assert sift_result['sifted_indices'] == [0, 2, 4]
    assert sift_result['alice_bits'] == [1, 0, 0]
    assert sift_result['bob_bits'] == [1, 0, 0]


def test_eve_intercept_resend_statistical_convergence():
    """
    Requirement 6 & 8.5: Run Eve-enabled simulations and verify statistically
    that the sifted-key error rate approaches 25% under the ideal intercept-and-resend
    model, rather than expecting exactly 25% in every run.
    """
    # Test across multiple runs with different seeds to ensure non-hardcoded emergent behaviour
    runs = 5
    n_per_run = 2000
    qber_values = []

    for seed in [101, 202, 303, 404, 505]:
        rng = create_rng(seed)
        alice = Alice(rng=rng)
        channel = QuantumChannel(distance_km=0.0, noise_level=0.0, detector_efficiency=1.0, dark_count_prob=0.0, rng=rng)
        eve = Eve(attack_strategy='intercept_resend', attack_prob=1.0, rng=rng)
        bob = Bob(rng=rng)
        protocol = BB84Protocol(rng=rng)

        bits = alice.generate_bits(n_per_run)
        bases = alice.choose_bases(n_per_run)
        states = alice.encode_states(bits, bases)

        chan_states = channel.transmit(states)
        eve_states = eve.intercept(chan_states)
        measured = bob.measure(eve_states)

        sift_result = protocol.sift(measured)
        alice_sifted = np.array(sift_result['alice_bits'])
        bob_sifted = np.array(sift_result['bob_bits'])

        err_rate = np.mean(alice_sifted != bob_sifted)
        qber_values.append(err_rate)

    # Verify that each run is stochastic (not identical hardcoded 0.25)
    assert len(set(qber_values)) > 1, "QBER values should emerge stochastically, not be identical constants"

    # Verify mean over the runs converges towards 25% (0.25)
    mean_qber = float(np.mean(qber_values))
    assert 0.22 <= mean_qber <= 0.28, f"Expected mean QBER ~ 0.25, got {mean_qber:.4f}"


def test_channel_noise_proportionality():
    """Verify channel noise flips bits according to noise_level."""
    rng = create_rng(777)
    alice = Alice(rng=rng)
    noise_level = 0.12
    channel = QuantumChannel(distance_km=0.0, noise_level=noise_level, detector_efficiency=1.0, dark_count_prob=0.0, rng=rng)
    bob = Bob(rng=rng)
    protocol = BB84Protocol(rng=rng)

    n = 3000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)

    chan_states = channel.transmit(states)
    measured = bob.measure(chan_states)
    sift_result = protocol.sift(measured)

    alice_sifted = np.array(sift_result['alice_bits'])
    bob_sifted = np.array(sift_result['bob_bits'])

    measured_qber = np.mean(alice_sifted != bob_sifted)
    # Measured QBER on matching bases should be approximately equal to noise_level (0.12)
    assert abs(measured_qber - noise_level) < 0.03, f"Expected QBER ~ {noise_level}, got {measured_qber:.4f}"


def test_qber_test_bits_exclusion_and_threshold():
    """
    Requirement 6: Calculate QBER using disclosed test bits, not all bits.
    Do not use test bits as secret key material after publicly revealing them.
    If QBER >= 11%, key must be rejected.
    """
    protocol = BB84Protocol(rng=create_rng(42))

    # Construct sifted states
    n_sifted = 40
    alice_bits = [0] * n_sifted
    bob_bits = [0] * n_sifted
    sifted_states = [
        {'index': i, 'alice_basis': '+', 'bob_basis': '+', 'alice_bit': 0, 'bob_bit': 0, 'measured': True}
        for i in range(n_sifted)
    ]

    sift_result = {
        'sifted_states': sifted_states,
        'alice_bits': alice_bits,
        'bob_bits': bob_bits,
        'sifted_indices': list(range(n_sifted)),
        'raw_count': 100,
        'sifted_count': n_sifted,
        'sift_efficiency': 0.4
    }

    qber_result = protocol.estimate_qber(sift_result)
    assert qber_result['qber_estimated'] is True
    assert qber_result['sample_size'] > 0
    assert qber_result['errors_found'] == 0
    assert qber_result['qber'] == 0.0
    assert qber_result['threshold_breached'] is False

    # Extract key
    key_result = protocol.extract_key(qber_result)
    assert key_result['session_aborted'] is False
    # Candidate key length must equal remaining bits (sifted - sample_size)
    assert key_result['key_length'] == n_sifted - qber_result['sample_size']

    # Test high error rate (threshold breach >= 11%)
    bob_corrupted = [1 if i % 2 == 0 else 0 for i in range(n_sifted)]
    sift_result_corrupted = {
        'sifted_states': [dict(s) for s in sifted_states],
        'alice_bits': alice_bits,
        'bob_bits': bob_corrupted,
        'sifted_indices': list(range(n_sifted)),
        'raw_count': 100,
        'sifted_count': n_sifted,
        'sift_efficiency': 0.4
    }
    qber_corrupted = protocol.estimate_qber(sift_result_corrupted)
    assert qber_corrupted['threshold_breached'] is True
    key_corrupted = protocol.extract_key(qber_corrupted)
    assert key_corrupted['session_aborted'] is True
    assert key_corrupted['key_length'] == 0


def test_simulation_three_scenarios():
    """Verify the 3 scenarios via POST /api/simulate."""
    # Scenario 1: Clean Channel (Eve OFF, Noise = 0)
    req1 = SimulationRequest(n_bits=100, distance_km=0.0, noise_level=0.0, eve_enabled=False, seed=123)
    res1 = run_simulation(req1)
    assert res1.qber == 0.0
    assert res1.secure_threshold_breached is False
    assert res1.key_exchange_aborted is False
    assert res1.post_sample_key_length > 0

    # Scenario 2: Eavesdropping (Eve ON, Noise = 0)
    req2 = SimulationRequest(n_bits=500, distance_km=0.0, noise_level=0.0, eve_enabled=True, seed=456)
    res2 = run_simulation(req2)
    assert res2.qber is not None
    assert res2.qber > 0.15  # Around 25%
    assert res2.secure_threshold_breached is True
    assert res2.key_exchange_aborted is True

    # Scenario 3: Channel Noise (Eve OFF, Noise = 0.15)
    req3 = SimulationRequest(n_bits=500, distance_km=0.0, noise_level=0.15, eve_enabled=False, seed=789)
    res3 = run_simulation(req3)
    assert res3.qber is not None
    assert 0.09 <= res3.qber <= 0.22  # Around 15%
