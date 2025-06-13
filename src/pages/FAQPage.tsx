import React from 'react';

const FAQPage = () => (
  <main className="px-10 md:px-20 lg:px-40 flex flex-1 justify-center py-12">
    <div className="layout-content-container flex flex-col items-center max-w-3xl flex-1 w-full">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tighter">Frequently Asked Questions</h2>
        <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
          Have questions? We've got answers. If you can't find what you're looking for, feel free to contact us.
        </p>
      </div>
      <div className="w-full space-y-8">
        {/* Category 1 */}
        <section>
          <h3 className="text-2xl font-semibold mb-6 text-[var(--accent-color-1)]">General &amp; Privacy</h3>
          <Accordion
            items={[
              {
                q: 'How does Anemoia work?',
                a: 'Anemoia uses advanced artificial intelligence algorithms to analyze and process your images. Our tools are trained on vast datasets to perform specific tasks like depth map generation, pose estimation, and image upscaling with high accuracy.'
              },
              {
                q: 'Are my images uploaded to your server? Is my data private?',
                a: 'Yes, to process your images they are temporarily uploaded to our secure servers and deleted shortly after. We never use them for other purposes without your explicit consent.'
              },
              {
                q: 'Why is the first time I use a tool slow?',
                a: 'The first invocation loads the AI model into memory; subsequent calls are much faster as the model is cached.'
              }
            ]}
          />
        </section>
        {/* Category 2 */}
        <section>
          <h3 className="text-2xl font-semibold mb-6 text-[var(--accent-color-2)]">Tool-Specific Questions</h3>
          <Accordion
            items={[
              {
                q: 'What is a Depth Map?',
                a: 'A depth map is a grayscale image indicating the distance of surface points from the camera—lighter = nearer, darker = farther.'
              },
              {
                q: 'What is Pose Estimation?',
                a: 'Pose estimation finds key body joints in an image to infer human posture, useful for animation, AR, and activity recognition.'
              },
              {
                q: 'How does the AI Upscaler work?',
                a: 'Unlike basic pixel duplication, our upscaler uses GAN-based models to predict missing detail, producing sharper higher-resolution images.'
              }
            ]}
          />
        </section>
        {/* Category 3 */}
        <section>
          <h3 className="text-2xl font-semibold mb-6 text-[var(--accent-color-3)]">Account &amp; Usage</h3>
          <Accordion
            items={[
              {
                q: 'Do I need an account to use the tools?',
                a: 'Many core tools work without an account. Signing in unlocks higher limits and lets you save work.'
              },
              {
                q: 'Is this service really free? How do you make money?',
                a: 'A generous free tier is available. Revenue comes from optional premium subscriptions and non-intrusive ads.'
              }
            ]}
          />
        </section>
      </div>
    </div>
  </main>
);

interface Item { q: string; a: string; }

const Accordion = ({ items }: { items: Item[] }) => (
  <div className="space-y-4">
    {items.map(({ q, a }) => (
      <details key={q} className="faq-item group bg-[var(--secondary-color)] p-4 rounded-lg">
        <summary className="flex items-center justify-between cursor-pointer hover:text-[var(--primary-color)] transition-colors">
          <span className="font-medium">{q}</span>
          <span className="material-symbols-outlined faq-icon-plus group-hover:text-[var(--primary-color)] transition-colors">add</span>
          <span className="material-symbols-outlined faq-icon-minus group-hover:text-[var(--primary-color)] transition-colors">expand_less</span>
        </summary>
        <p className="text-[var(--text-secondary)] mt-3 text-sm leading-relaxed">{a}</p>
      </details>
    ))}
  </div>
);

export default FAQPage; 