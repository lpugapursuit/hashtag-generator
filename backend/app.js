// Load environment variables from .env file
require('dotenv').config();

// Import necessary modules
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Firebase Admin SDK initialization
var admin = require("firebase-admin");
var serviceAccount = require("./myminibasedatapp-firebase-adminsdk-fbsvc-aa88cf3a9e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Access Gemini API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Validate API key format (basic validation)
if (GEMINI_API_KEY && !GEMINI_API_KEY.startsWith('AIza')) {
    console.error("❌ Invalid GEMINI_API_KEY format. API key should start with 'AIza'. Please check your .env file.");
    process.exit(1);
}


// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000; // Reverted back to 3000 for local development

// --- START: CORS CONFIGURATION ---

// Define your Vercel app's URL as an allowed origin
const allowedOrigins = [
  'https://hash-brown-eight.vercel.app',  // Vercel production frontend
  'http://localhost:3000',                // Local development
  process.env.FRONTEND_URL                // Environment variable fallback
].filter(Boolean); // Remove any undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from your Vercel app or no origin (for server-to-server requests)
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false
};

// Use the CORS middleware with your specific options
app.use(cors(corsOptions));

// --- END: CORS CONFIGURATION ---

// Your other middleware, like express.json()
app.use(express.json());

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize Google Gemini models
if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is not set in the .env file. Please set it to proceed.");
    process.exit(1);
}

console.log("✅ GEMINI_API_KEY loaded successfully");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Get references to the specific Gemini models
const geminiVisionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const geminiTextModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Converts a Buffer to a GoogleGenerativeAI.Part object suitable for Gemini Vision API.
 * @param {Buffer} buffer The image buffer.
 * @param {string} mimeType The MIME type of the image (e.g., 'image/jpeg', 'image/png').
 * @returns {object} A part object with inlineData.
 */
function fileToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString('base64'), // Convert buffer to base64 string
            mimeType
        },
    };
}

/**
 * POST /generate-hashtags
 * Endpoint to generate hashtags from an uploaded image and/or description.
 * This endpoint uses `upload.single('image')` to handle the file upload.
 * The frontend should send the image file with the field name 'image'
 * and the description text with the field name 'description'.
 *
 * Expects:
 * - 'image' (file upload, optional, via FormData)
 * - 'description' (string, optional, via FormData)
 */
app.post('/generate-hashtags', upload.single('image'), async (req, res) => {
    try {
        // Access the uploaded file (if any) and the description from the request body
        const imageFile = req.file; // Multer puts the file buffer here
        const description = req.body.description; // Text description from the form data

        // Basic validation: at least one of image or description must be present
        if (!imageFile && (!description || description.trim() === "")) {
            return res.status(400).json({ error: "Image or description is required." });
        }

        // Log received data for debugging
        console.log('Received /generate-hashtags request:');
        console.log('  Image present:', !!imageFile);
        console.log('  Description:', description ? `"${description}"` : 'None');

        let visionResponseText = "";
        // --- Step 1: Analyze Image with gemini-pro-vision if an image is provided ---
        if (imageFile) {
            console.log('Calling gemini-pro-vision for image analysis...');
            try {
                // Construct the prompt for the vision model
                const visionPrompt = [
                    fileToGenerativePart(imageFile.buffer, imageFile.mimetype),
                    { text: "Describe this image in detail, focusing on key objects, themes, colors, and emotions. Provide a concise summary suitable for generating social media hashtags. Do not include any hashtags in this description." }
                ];
                
                // Call the gemini-pro-vision model
                const visionResult = await geminiVisionModel.generateContent({ contents: [{ role: "user", parts: visionPrompt }] });
                visionResponseText = visionResult.response.text();
                console.log('Gemini Vision Response:', visionResponseText);

            } catch (visionError) {
                console.error('Error calling Gemini Vision API:', visionError);
                // Continue without vision data if there's an error, or return an error
                // For MVP, we'll continue, but a robust app might handle this more strictly
                visionResponseText = "Could not analyze image.";
            }
        }

        // --- Step 2: Generate Hashtags with gemini-pro ---
        console.log('Calling gemini-pro for hashtag generation...');
        let combinedPrompt = "Generate 10-15 highly relevant, trending, and engaging hashtags. Return them as a comma-separated list. Do NOT include any introductory or concluding text, just the hashtags. If no relevant hashtags can be generated, return 'No hashtags found'.";

        if (description && description.trim() !== "") {
            combinedPrompt += `\n\nUser provided description: "${description}"`;
        }
        if (visionResponseText && visionResponseText !== "Could not analyze image.") {
            combinedPrompt += `\n\nImage analysis: "${visionResponseText}"`;
        } else if (!description || description.trim() === "") {
             // If no image and no user description, tell Gemini to generate based on general knowledge
             combinedPrompt = "Generate 10-15 general, trending, and engaging hashtags. Return them as a comma-separated list. Do NOT include any introductory or concluding text, just the hashtags. If no relevant hashtags can be generated, return 'No hashtags found'.";
        }

        try {
            // Call the gemini-pro model for text generation
            const textResult = await geminiTextModel.generateContent({ contents: [{ role: "user", parts: [{ text: combinedPrompt }] }] });
            let generatedHashtags = textResult.response.text().trim();

            // Clean up the response: remove any leading/trailing non-hashtag text
            // Simple regex to ensure it starts with # and contains only valid hashtag characters
            const hashtagRegex = /^(#[\w\d_]+\s*[,]?\s*)+$/;
            if (!hashtagRegex.test(generatedHashtags)) {
                // If the response is not purely hashtags, try to extract them
                const extractedTags = generatedHashtags.match(/#[\w\d_]+/g);
                generatedHashtags = extractedTags ? extractedTags.join(', ') : 'No hashtags found.';
            }

            // Send the generated hashtags back to the frontend
            res.json({ hashtags: generatedHashtags });

        } catch (textError) {
            console.error('Error calling Gemini Text API:', textError);
            res.status(500).json({ error: "Failed to generate hashtags. Please try again." });
        }

    } catch (error) {
        console.error('Unhandled error in /generate-hashtags:', error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 AI Hashtag Generator backend running on port ${PORT}`);
    console.log(`📝 Generate hashtags endpoint: http://localhost:${PORT}/generate-hashtags`);
});
