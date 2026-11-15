import { describe, expect, it } from 'vitest'
import { pointFromUrl, urlWithPoint } from './manifest'

describe('a spot in the address', () => {
  it('reads latitude then longitude, and ignores anything else', () => {
    expect(pointFromUrl('?at=28.17,85.35')).toEqual([85.35, 28.17])
    expect(pointFromUrl('?case=rasuwa-2026&at=-33.4,%20-70.5')).toEqual([-70.5, -33.4])
    expect(pointFromUrl('?at=91,85')).toBeNull()
    expect(pointFromUrl('?at=28.1,200')).toBeNull()
    expect(pointFromUrl('?at=abc')).toBeNull()
    expect(pointFromUrl('?at=28.1,85.3,1')).toBeNull()
    expect(pointFromUrl('')).toBeNull()
  })
  it('writes the spot with a readable comma, keeps the case, and removes it when cleared', () => {
    const u = urlWithPoint('http://localhost/x/?case=tsho-rolpa-2026', [86.47, 27.86])
    expect(u).toBe('http://localhost/x/?case=tsho-rolpa-2026&at=27.86000,86.47000')
    expect(pointFromUrl(new URL(u).search)).toEqual([86.47, 27.86])
    expect(urlWithPoint(u, null)).toBe('http://localhost/x/?case=tsho-rolpa-2026')
  })
})
