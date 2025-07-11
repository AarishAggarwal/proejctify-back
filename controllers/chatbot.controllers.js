import { generateProjectIdeas, generateExecutionPlan } from '../generator.js';
import { getSimilarProjects } from '../vectorizer.js';
import { extractTopicFromInput } from '../query_parser.js';

export const chatbotTest = async (req, res) => {
    res.status(200).json({ 
        message: 'Chatbot endpoint is working!',
        timestamp: new Date().toISOString()
    });
};

export const chatbotResponse = async (req, res) => {
    try {
        console.log('=== CHATBOT REQUEST RECEIVED ===');
        const { message } = req.body;
        
        if (!message || !message.trim()) {
            console.log('No message provided');
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('Chatbot request:', message);

        // TEMPORARY: Return a simple test response first
        if (message.toLowerCase().includes('test')) {
            console.log('Returning test response');
            return res.status(200).json({
                response: '🎉 Backend chatbot is working! This is a test response from the JavaScript backend.'
            });
        }

        // Extract topic from user message
        let query;
        try {
            console.log('Extracting topic...');
            query = await extractTopicFromInput(message);
            console.log('Extracted query:', query);
        } catch (error) {
            console.error('Error extracting topic:', error);
            query = message;
        }

        // Find similar projects
        let sims = [];
        try {
            console.log('Finding similar projects...');
            sims = getSimilarProjects(query, 5);
            console.log('Similar projects found:', sims.length);
        } catch (error) {
            console.error('Error getting similar projects:', error);
            sims = [];
        }

        // Generate project ideas
        let ideas = [];
        try {
            console.log('Generating project ideas...');
            ideas = await generateProjectIdeas(null, query, null);
            console.log('Generated ideas:', ideas.length);
        } catch (error) {
            console.error('Error generating ideas:', error);
            ideas = ['Error generating ideas.'];
        }

        // Return the response
        const response = ideas[0] || 'Sorry, I could not generate project ideas at this time.';
        console.log('Sending response:', response.substring(0, 100) + '...');
        
        res.status(200).json({
            response: response
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({
            response: 'Sorry, I encountered an error. Please try again.'
        });
    }
}; 