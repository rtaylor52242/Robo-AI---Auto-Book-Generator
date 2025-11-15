import React from 'react';
import { XMarkIcon } from './icons';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gray-800 text-indigo-100/90 border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-2xl font-bold text-indigo-300">How to Use This App</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-6 overflow-y-auto space-y-6">
            <section>
                <h3 className="text-lg font-semibold text-indigo-200 mb-2">Step 1: Configure Your Book</h3>
                <p className="mb-2">
                    This is the conceptualization phase. Fill in the details about your book idea.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Title, Subtitle, Author:</strong> The essential details for your book. These are required to proceed.</li>
                    <li><strong>Book Description:</strong> A summary of your book. This is crucial as the AI uses it to generate the table of contents and chapter content. You can use the "Dictate" button to use speech-to-text.</li>
                    <li><strong>Inspire Me:</strong> If you're stuck, click the "Let AI Inspire You!" button at the top. It will fill in the title, subtitle, and description based on your selected genre, category, and tone.</li>
                    <li><strong>Genre, Category, Tone:</strong> These help the AI understand the style of the book you want to create.</li>
                    <li><strong>Chapters & Words:</strong> Define the structure of your book.</li>
                </ul>
                <p className="mt-2 text-sm">Once you're happy with the configuration, click <strong>"Generate Table of Contents"</strong> to move to the next step.</p>
            </section>

            <section>
                <h3 className="text-lg font-semibold text-indigo-200 mb-2">Step 2: Design Your Covers</h3>
                 <p className="mb-2">
                    In this step, you'll create the cover art for your book based on the description you provided.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>The AI has already generated two descriptive prompts for your front and back covers. You can edit these prompts to refine the visual style.</li>
                    <li><strong>Important:</strong> These prompts generate <strong className="text-yellow-300">images only</strong>. Do not add text like the book title to the prompt, as it will not appear correctly.</li>
                    <li>Click <strong>"Generate Front Cover"</strong> or <strong>"Generate Back Cover"</strong> to create the images one by one, or "Generate Both Covers".</li>
                </ul>
                <p className="mt-2 text-sm">When your covers are ready, click <strong>"Proceed to Writing"</strong>.</p>
            </section>

            <section>
                <h3 className="text-lg font-semibold text-indigo-200 mb-2">Step 3: Write Your Book</h3>
                <p className="mb-2">
                    Here, you will bring your chapters to life.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Click on a chapter title to expand it.</li>
                    <li><strong>Generate w/ Continuity:</strong> This is the recommended option. The AI will consider the content of the previous chapter to ensure a smooth narrative flow.</li>
                    <li><strong>Generate Standalone:</strong> The AI will write the chapter based only on its title and the book's main description.</li>
                    <li><strong>Generate All Chapters:</strong> This button will automatically go through and generate all unwritten chapters sequentially, using continuity.</li>
                    <li><strong>Editing:</strong> You can manually edit the content of any chapter in its text area at any time.</li>
                </ul>
                <p className="mt-2 text-sm">Once all chapters have the "done" status, the <strong>"Assemble Final Book"</strong> button will become active.</p>
            </section>
            
            <section>
                <h3 className="text-lg font-semibold text-indigo-200 mb-2">Final Assembly & History</h3>
                 <p className="mb-2">
                    After assembling the book, a viewer will pop up.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Use the "Previous" and "Next" buttons to flip through your book.</li>
                    <li>Use the download icons at the bottom to export your complete manuscript as a <strong>PDF, DOCX, HTML, or Markdown</strong> file.</li>
                    <li>Your completed book is automatically saved to the <strong>Book History</strong> panel on the main screen. You can reopen or delete your past creations from there.</li>
                </ul>
            </section>
        </main>
      </div>
    </div>
  );
};
