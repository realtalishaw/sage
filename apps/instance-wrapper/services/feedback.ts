/**
 * Feedback API service
 * Connects to the feedback API endpoint for sending confirmation emails
 */

const API_BASE_URL = 'https://dev.gia.run';

export interface SendFeedbackEmailRequest {
  email: string;
  feedback: string;
}

export interface SendFeedbackEmailResponse {
  success: boolean;
  message: string;
  email_id?: string;
}

/**
 * Send feedback confirmation email
 * 
 * @param email - Email address of the feedback submitter
 * @param feedback - The feedback message that was submitted
 * @returns The email response
 */
export const sendFeedbackEmail = async (
  email: string,
  feedback: string
): Promise<SendFeedbackEmailResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/feedback/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        feedback,
      } as SendFeedbackEmailRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Feedback email API error: ${response.status} ${errorText}`);
    }

    const data: SendFeedbackEmailResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling feedback email API:', error);
    throw error;
  }
};
