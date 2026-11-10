import numpy as np

from cascade_lens import hazard as hz


def test_slope_of_a_known_plane():
    y, x = np.mgrid[0:20, 0:20].astype(float)
    z = x * 40 * np.tan(np.radians(30))  # 30 deg ramp at 40 m posting
    assert abs(np.median(hz.slope_deg(z, 40)) - 30) < 0.01


def test_flow_accumulates_down_a_ramp():
    y, x = np.mgrid[0:5, 0:6].astype(float)
    acc = hz.flow_accumulation(100 - x * 10)  # everything drains to x = 5
    assert acc[:, 0].max() == 1
    assert acc[:, -1].min() >= 6


def test_hollow_is_convergent():
    y, x = np.mgrid[-15:16, -15:16].astype(float)
    valley = 0.5 * x ** 2 - 20 * y  # slope downhill in +y, valley along x = 0
    k = hz.plan_curvature(valley, 40)
    assert k[15, 15] < 0


def test_classes_follow_the_rules():
    f = np.array([0, hz.STEEP_1, hz.STEEP_1 | hz.HOLLOW, hz.STEEP_2, hz.STEEP_2 | hz.WET, hz.STEEP_3 | hz.HOLLOW | hz.WET, 255], np.uint8)
    assert hz.classify(f).tolist() == [1, 1, 2, 2, 3, 4, 0]


def test_auc():
    s = np.array([1, 2, 3, 4], float)
    pos = np.array([False, False, True, True])
    assert hz.auc(s, pos, ~pos) == 1.0
    assert hz.auc(np.ones(4), pos, ~pos) == 0.5
