const apiKey = "AIzaSyB6ZvDo3qUvuonroMCdWePm8ey8SchCkbk";

// Install dependencies first:
// npm install @google/genai mime

import { GoogleGenAI } from '@google/genai';
import mime from 'mime';
import { writeFile } from 'fs';

// Save a binary file (image, audio, etc.)
function saveBinaryFile(fileName, content) {
  writeFile(fileName, content, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file ${fileName}:`, err);
      return;
    }
    console.log(`File ${fileName} saved to file system.`);
  });
}

async function main() {
  const ai = new GoogleGenAI({
    apiKey: process.env.AIzaSyCEJeNY_a0N7dYdF0O0OmI37JyXQtizr9I, // make sure this is set in your environment
    // apiKey: "AIzaSyCEJeNY_a0N7dYdF0O0OmI37JyXQtizr9I"
  });

  const config = {
    responseModalities: ['IMAGE', 'TEXT'],
  };

  const model = 'gemini-2.5-flash-image';

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: 'INSERT_INPUT_HERE', // replace with your input prompt
        },
      ],
    },
  ];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  let fileIndex = 0;

  for await (const chunk of response) {
    const candidate = chunk?.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (!part) continue;

    if (part.inlineData) {
      const fileName = `ENTER_FILE_NAME_${fileIndex++}`;
      const inlineData = part.inlineData;
      const fileExtension = mime.getExtension(inlineData.mimeType || '');
      const buffer = Buffer.from(inlineData.data || '', 'base64');
      saveBinaryFile(`${fileName}.${fileExtension}`, buffer);
    } else if (chunk.text) {
      console.log(chunk.text);
    }
  }
}

main().catch(console.error);
