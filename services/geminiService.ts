import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateInspiration = async (genre: string, category: string, tone: string): Promise<{ title: string; subtitle: string; description: string }> => {
  const prompt = `Generate a unique and compelling book idea.
  Genre: ${genre}
  Category: ${category}
  Tone: ${tone}
  
  Provide a JSON object with three keys: "title", "subtitle", and "description". The description should be a concise and engaging summary of the book concept, around 100-150 words.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["title", "subtitle", "description"],
      },
    },
  });

  const text = response.text;
  return JSON.parse(text);
};


export const generateTableOfContents = async (description: string, numChapters: number): Promise<string[]> => {
  const prompt = `Based on the following book description, generate a table of contents with exactly ${numChapters} chapter titles. The titles should be logical, sequential, and compelling.
  
  Description: "${description}"
  
  Return a JSON object with a single key "chapters", which is an array of strings. Each string is a chapter title.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chapters: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["chapters"]
      }
    }
  });

  const text = response.text;
  const parsed = JSON.parse(text);
  return parsed.chapters;
};

export const generateChapterContent = async (
  title: string,
  description: string,
  chapterTitle: string,
  wordsPerChapter: number,
  previousChapterContent?: string
): Promise<string> => {
  let prompt = `You are writing a book titled "${title}". The book's overall description is: "${description}".
  
  Your current task is to write the content for the chapter titled: "${chapterTitle}".
  The chapter should be approximately ${wordsPerChapter} words long.
  The content should be well-structured, engaging, and directly related to the chapter title. Format the output in Markdown.
  `;

  if (previousChapterContent) {
    const summary = previousChapterContent.substring(0, 300);
    prompt += `\nFor context and continuity, here is a summary of the previous chapter: "${summary}...". Ensure a smooth transition.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });

  return response.text;
};

export const generateBookCoverPrompt = async (title: string, subtitle: string, description: string, author: string, type: 'front' | 'back'): Promise<string> => {
  const prompt = `Create a stunning, high-quality book cover art prompt for an AI image generator.
  Book Title: "${title}"
  Book Subtitle: "${subtitle}"
  Book Description: "${description}"
  
  Based on these details, generate a descriptive and artistic prompt for the **${type} cover**. 
  
  **Instructions for the ${type} cover:**
  ${type === 'front' 
    ? "Focus on a central, iconic image that captures the book's essence. The prompt should be evocative and detailed, mentioning style, color palette, and mood." 
    : "The design must look like a book's **back cover**. It should be complementary to the front cover's theme but more subdued. Crucially, it must incorporate placeholders or clear, empty spaces for: a book summary (blurb), a small author photo, and a barcode area. The prompt should describe a background image or design that allows for this text and other elements to be overlaid later."}

  Example prompt format: "Epic fantasy landscape, cinematic lighting, hyperrealistic, a lone castle on a mountain peak under a stormy sky, style of Rembrandt."
  
  **IMPORTANT**: The generated prompt is for an AI that creates **images only**. Do NOT include any text like the title or author's name in the prompt you generate. The prompt should describe the visual elements of the cover art.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text;
};

export const generateBookCoverImage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '3:4',
            outputMimeType: 'image/jpeg',
        },
    });

  return response.generatedImages[0].image.imageBytes;
};


export const generatePreface = async (title: string, description: string): Promise<string> => {
    const prompt = `Write a compelling preface for a book titled "${title}".
    The book's description is: "${description}".
    The preface should be around 200-300 words, setting the stage for the reader and introducing the core themes of the book. Write in an engaging and thoughtful tone. Output in Markdown.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt
    });

    return response.text;
}