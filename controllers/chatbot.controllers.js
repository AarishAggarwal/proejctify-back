import { generateProjectIdeas, generateExecutionPlan } from '../generator.js';
import { getSimilarProjects } from '../vectorizer.js';
import { extractTopicFromInput } from '../query_parser.js';

export const chatbotResponse = async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('Chatbot request:', message);

        // Extract topic from user message
        let query;
        try {
            query = await extractTopicFromInput(message);
            console.log('Extracted query:', query);
        } catch (error) {
            console.error('Error extracting topic:', error);
            query = message;
        }

        // Find similar projects
        let sims = [];
        try {
            sims = getSimilarProjects(query, 5);
            console.log('Similar projects:', sims);
        } catch (error) {
            console.error('Error getting similar projects:', error);
            sims = [];
        }

        // Generate project ideas
        let ideas = [];
        try {
            ideas = await generateProjectIdeas(null, query, null);
            console.log('Generated ideas:', ideas);
        } catch (error) {
            console.error('Error generating ideas:', error);
            ideas = ['Error generating ideas.'];
        }

        // Return the response
        res.status(200).json({
            response: ideas[0] || 'Sorry, I could not generate project ideas at this time.'
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({
            response: 'Sorry, I encountered an error. Please try again.'
        });
    }
}; 