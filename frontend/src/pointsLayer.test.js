import { getSeverityColor, getPointSize, buildPointsGeometryData } from './pointsLayer';

describe('getSeverityColor', () => {
  test('returns flat green across the whole good range', () => {
    expect(getSeverityColor(0)).toEqual([0, 1, 0.392]);
    expect(getSeverityColor(12)).toEqual([0, 1, 0.392]);
  });

  test('hits the exact stop colors at each breakpoint', () => {
    expect(getSeverityColor(35)).toEqual([1, 0.863, 0]);   // Amarillo
    expect(getSeverityColor(55)).toEqual([1, 0.392, 0]);   // Naranja
    expect(getSeverityColor(80)).toEqual([1, 0, 0]);       // Rojo
    expect(getSeverityColor(200)).toEqual([1, 0, 0]);      // clamped past ceiling
  });

  test('blends smoothly between breakpoints instead of snapping', () => {
    const midYellowOrange = getSeverityColor(45); // halfway between 35 and 55
    expect(midYellowOrange[0]).toBeCloseTo(1);
    expect(midYellowOrange[1]).toBeCloseTo((0.863 + 0.392) / 2, 2);
    expect(midYellowOrange[2]).toBeCloseTo(0);
  });
});

describe('getPointSize', () => {
  test('clamps to the minimum size at or below zero', () => {
    expect(getPointSize(0)).toBeCloseTo(6.5);
    expect(getPointSize(-10)).toBeCloseTo(6.5);
  });

  test('clamps to the maximum size at or above the ceiling value', () => {
    expect(getPointSize(80)).toBeCloseTo(15.0);
    expect(getPointSize(500)).toBeCloseTo(15.0);
  });

  test('grows continuously between the min and max', () => {
    const small = getPointSize(10);
    const medium = getPointSize(40);
    const large = getPointSize(70);
    expect(small).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
  });
});

describe('buildPointsGeometryData', () => {
  test('returns empty typed arrays for no points', () => {
    const result = buildPointsGeometryData([], () => ({ x: 0, y: 0, z: 0 }));
    expect(result.positions.length).toBe(0);
    expect(result.colors.length).toBe(0);
    expect(result.sizes.length).toBe(0);
  });

  test('fills position/color/size attributes per point in order', () => {
    const points = [
      { lat: 10, lng: 20, value: 5 },
      { lat: -30, lng: 40, value: 60 },
    ];
    const getCoords = jest.fn((lat, lng) => ({ x: lat, y: 0, z: lng }));

    const { positions, colors, sizes } = buildPointsGeometryData(points, getCoords);

    expect(getCoords).toHaveBeenNthCalledWith(1, 10, 20);
    expect(getCoords).toHaveBeenNthCalledWith(2, -30, 40);

    expect(Array.from(positions)).toEqual([10, 0, 20, -30, 0, 40]);

    const closeTriplet = (actual, expected) =>
      actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i]));

    closeTriplet(Array.from(colors.slice(0, 3)), getSeverityColor(5));
    closeTriplet(Array.from(colors.slice(3, 6)), getSeverityColor(60));

    expect(sizes[0]).toBeCloseTo(getPointSize(5));
    expect(sizes[1]).toBeCloseTo(getPointSize(60));
  });
});
