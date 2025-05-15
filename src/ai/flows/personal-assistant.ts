'use server';

/**
 * @fileOverview A voice-activated personal assistant AI agent.
 *
 * - personalAssistant - A function that handles the personal assistant process.
 * - PersonalAssistantInput - The input type for the personalAssistant function.
 * - PersonalAssistantOutput - The return type for the personalAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalAssistantInputSchema = z.object({
  speech: z.string().describe('The transcribed speech from the user.'),
  location: z.string().optional().describe('The current location of the user.'),
});

export type PersonalAssistantInput = z.infer<typeof PersonalAssistantInputSchema>;

const PersonalAssistantOutputSchema = z.object({
  response: z.string().describe('The response from the personal assistant.'),
});

export type PersonalAssistantOutput = z.infer<typeof PersonalAssistantOutputSchema>;

export async function personalAssistant(input: PersonalAssistantInput): Promise<PersonalAssistantOutput> {
  return personalAssistantFlow(input);
}

const personalAssistantPrompt = ai.definePrompt({
  name: 'personalAssistantPrompt',
  input: {schema: PersonalAssistantInputSchema},
  output: {schema: PersonalAssistantOutputSchema},
  prompt: `You are a helpful personal assistant. The user will provide a speech input, and you should respond appropriately, taking into account their location if provided.\n\nSpeech: {{{speech}}}\n\nLocation: {{{location}}}`,
});

const personalAssistantFlow = ai.defineFlow(
  {
    name: 'personalAssistantFlow',
    inputSchema: PersonalAssistantInputSchema,
    outputSchema: PersonalAssistantOutputSchema,
  },
  async input => {
    const {output} = await personalAssistantPrompt(input);
    return output!;
  }
);
