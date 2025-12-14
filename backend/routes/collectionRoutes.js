const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Get all available data collections
router.get('/', async (req, res) => {
  try {
    const dataPath = path.join(__dirname, '../data');
    const files = await fs.readdir(dataPath);
    
    const collections = files
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file.replace('.json', ''),
        filename: file,
        url: `/data/${file}`,
        lastModified: null // You can add file stats here if needed
      }));

    res.json({
      message: 'Available data collections',
      collections,
      total: collections.length
    });
  } catch (error) {
    console.error('Error reading data directory:', error);
    res.status(500).json({
      error: 'Failed to read data collections',
      message: error.message
    });
  }
});

// Get specific collection by name
router.get('/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const filePath = path.join(__dirname, '../data', `${collection}.json`);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        error: 'Collection not found',
        message: `The collection '${collection}' does not exist`
      });
    }
    
    const data = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    
    res.json({
      collection,
      data: jsonData,
      count: Array.isArray(jsonData) ? jsonData.length : 1
    });
  } catch (error) {
    console.error('Error reading collection:', error);
    res.status(500).json({
      error: 'Failed to read collection',
      message: error.message
    });
  }
});

module.exports = router;
