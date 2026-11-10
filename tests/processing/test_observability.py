"""Radar Observability: geometry flags and per-task classes on synthetic terrain (not NASA data)."""
import numpy as np

from cascade_lens import observability as ob


def plane(dzdx_per_m, n=20, posting=40.0):
    x = np.arange(n) * posting
    return np.tile(x * dzdx_per_m, (n, 1))


LOS_WEST = (np.full((20, 20), -0.64), np.zeros((20, 20)))  # sensor to the west, as for a right-looking descending pass
INC = np.full((20, 20), 40.0)


def flags_for(dzdx):
    return ob.geometry_flags(plane(dzdx), 40.0, *LOS_WEST, INC)[2:-2, 2:-2]


def test_gentle_slope_is_visible():
    assert not flags_for(-0.2).any()  # 11 degrees toward the sensor


def test_steep_slope_toward_sensor_is_layover():
    f = flags_for(-1.0)  # 45 degrees rising toward the sensor, steeper than the 40 degree incidence
    assert (f & ob.LAYOVER).all() and not (f & ob.SHADOW).any()


def test_steep_slope_away_is_shadow():
    f = flags_for(1.5)  # 56 degrees falling away, steeper than 90 - 40 = 50
    assert (f & ob.SHADOW).all() and not (f & ob.LAYOVER).any()


def test_low_coherence_spoils_movement_but_not_disturbance():
    f = np.array([[ob.LOWCOH | ob.NOCC]], np.uint8)
    assert ob.classify(f, "movement")[0, 0] == 2
    assert ob.classify(f, "disturbance")[0, 0] == 1  # low coherence is the signal for disturbance


def test_incoherent_baseline_spoils_disturbance():
    assert ob.classify(np.array([[ob.LOWBASE]], np.uint8), "disturbance")[0, 0] == 2


def test_priority_outside_beats_everything():
    f = np.array([[ob.OUTSIDE | ob.LAYOVER | ob.LOWCOH]], np.uint8)
    assert ob.classify(f, "movement")[0, 0] == 5 and ob.classify(f, "disturbance")[0, 0] == 5


def test_summary_never_calls_missing_data_usable():
    cls = np.array([[5, 5, 5, 1]], np.uint8)
    s = ob.summary(cls, np.ones(cls.shape, bool), "movement")
    assert s["percent"]["Outside the frame checked"] == 75.0 and s["verdict"] == "Partial evidence"
    s = ob.summary(np.array([[5, 5, 5, 5, 5, 1]], np.uint8), np.ones((1, 6), bool), "movement")
    assert s["verdict"] == "Insufficient evidence"
