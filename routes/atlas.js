const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Load atlas data
let atlasData = null;
function getAtlas() {
  if (!atlasData) {
    const filePath = path.join(__dirname, '..', 'data', 'anatomy-atlas.json');
    atlasData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return atlasData;
}

// GET /api/atlas/regions - list all regions
router.get('/regions', (req, res) => {
  try {
    const atlas = getAtlas();
    const regions = atlas.regions.map(r => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      subregionCount: r.subregions.length
    }));
    res.json(regions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/atlas/regions/:regionId - get region with subregions
router.get('/regions/:regionId', (req, res) => {
  try {
    const atlas = getAtlas();
    const region = atlas.regions.find(r => r.id === req.params.regionId);
    if (!region) return res.status(404).json({ error: 'Region not found' });
    res.json(region);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/atlas/regions/:regionId/:subregionId - detailed subregion
router.get('/regions/:regionId/:subregionId', (req, res) => {
  try {
    const atlas = getAtlas();
    const region = atlas.regions.find(r => r.id === req.params.regionId);
    if (!region) return res.status(404).json({ error: 'Region not found' });

    const subregion = region.subregions.find(s => s.id === req.params.subregionId);
    if (!subregion) return res.status(404).json({ error: 'Subregion not found' });

    res.json({ ...subregion, regionName: region.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/atlas/search?q=frontal
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const atlas = getAtlas();
    const query = q.toLowerCase();
    const results = [];

    atlas.regions.forEach(region => {
      region.subregions.forEach(sub => {
        const matchScore =
          (sub.name.toLowerCase().includes(query) ? 3 : 0) +
          (sub.description && sub.description.toLowerCase().includes(query) ? 2 : 0) +
          (sub.keyStructures && sub.keyStructures.some(s => s.toLowerCase().includes(query)) ? 2 : 0) +
          (sub.clinicalRelevance && sub.clinicalRelevance.toLowerCase().includes(query) ? 1 : 0);

        if (matchScore > 0) {
          results.push({
            regionId: region.id,
            regionName: region.name,
            subregionId: sub.id,
            subregionName: sub.name,
            matchScore
          });
        }
      });
    });

    results.sort((a, b) => b.matchScore - a.matchScore);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
