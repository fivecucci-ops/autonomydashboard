// server.js - Local development server using Express

const express = require('express');
const { authorize, readActiveTab, readVendorsTab, readChatTab, addChatMessage, writeActiveTab } = require('./sync');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

// Example API endpoint for reading Active tab
app.get('/api/read-active', async (req, res) => {
    const { spreadsheetId } = req.query;
    if (!spreadsheetId) {
        return res.status(400).json({ error: 'spreadsheetId is required' });
    }
    try {
        const data = await readActiveTab(spreadsheetId);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// API endpoint for reading Vendors tab
app.get('/api/read-vendors', async (req, res) => {
    const { spreadsheetId } = req.query;
    if (!spreadsheetId) {
        return res.status(400).json({ error: 'spreadsheetId is required' });
    }
    try {
        const data = await readVendorsTab(spreadsheetId);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to read vendors data' });
    }
});

// API endpoint for reading Chat tab
app.get('/api/read-chat', async (req, res) => {
    const { spreadsheetId, user } = req.query;
    if (!spreadsheetId) {
        return res.status(400).json({ error: 'spreadsheetId is required' });
    }
    try {
        const data = await readChatTab(spreadsheetId, user);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to read chat data' });
    }
});

// API endpoint for adding chat message
app.post('/api/add-chat-message', express.json(), async (req, res) => {
    try {
        const { sender, message, type, participants, tags } = req.body;
        if (!sender || !message) {
            return res.status(400).json({ error: 'User and message are required' });
        }
        const result = await addChatMessage({ sender, message, type, participants, tags });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add chat message' });
    }
});

// API endpoint for saving patient to Active tab
app.post('/api/save-patient', async (req, res) => {
    try {
        const patientData = req.body;
        if (!patientData.patientName) {
            return res.status(400).json({ error: 'Patient name is required' });
        }
        const result = await writeActiveTab(patientData);
        res.json(result);
    } catch (err) {
        console.error('Error saving patient:', err);
        res.status(500).json({ error: 'Failed to save patient data' });
    }
});

// TODO: Add more endpoints for write, search, etc.

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 