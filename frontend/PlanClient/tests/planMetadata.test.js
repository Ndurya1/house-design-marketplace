import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPlanMetadata, getPackageContents } from '../src/lib/planMetadata.js';

test('formats available architectural metadata with its stored unit', () => {
  assert.deepEqual(formatPlanMetadata({ bedrooms: 3, storeys: 2, floor_area: '145.50', floor_area_unit: 'sqm', plot_requirements: '50 × 100 ft' }), [
    { label: 'Bedrooms', value: '3' },
    { label: 'Storeys', value: '2' },
    { label: 'Floor area', value: '145.5 m²' },
    { label: 'Plot requirements', value: '50 × 100 ft' },
  ]);
});

test('handles missing metadata and normalizes package contents safely', () => {
  assert.deepEqual(formatPlanMetadata({}), []);
  assert.deepEqual(getPackageContents({ package_contents: [' Floor plans ', '', 4, 'Material schedule'] }), ['Floor plans', 'Material schedule']);
});
