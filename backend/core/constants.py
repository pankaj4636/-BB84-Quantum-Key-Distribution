"""
Single source of truth for all BB84 physical constants.
Import from here in every module. Never hardcode these values elsewhere.
All values conform to PHYSICS_CONTRACT.md Section 9.
"""

ATTENUATION_COEFF_DB_PER_KM: float = 0.2
DETECTOR_EFFICIENCY: float         = 0.85
DARK_COUNT_PROB: float             = 1e-5
QBER_SECURITY_THRESHOLD: float     = 0.11
SAMPLE_FRACTION_FOR_QBER: float    = 0.10

# Sifted-key sampling policy. Supports small educational demonstration runs (>= 2 sifted bits)
# as well as larger runs. Sifted bits are partitioned into public test bits (to estimate QBER)
# and candidate secret key bits.
QBER_MIN_SIFTED_COUNT: int         = 2
QBER_FIXED_SAMPLE_SIZE: int        = 50
QBER_PERCENT_SAMPLE_THRESHOLD: int = 500
QBER_MIN_SAMPLE_SIZE: int          = 1

# Confidence tiers for small test samples:
# Sample sizes below 35 bits may not reliably detect eavesdropping.
QBER_PREVIEW_LOW_MIN_SIFTED_COUNT: int = 15
BASES: list                        = ['+', 'x']

STATE_LABELS: dict                 = {
    ('+', 0): '|0>',
    ('+', 1): '|1>',
    ('x', 0): '|+>',
    ('x', 1): '|->'
}

POLARIZATION_ANGLES: dict          = {
    ('+', 0): 0,
    ('+', 1): 90,
    ('x', 0): 45,
    ('x', 1): 135
}
