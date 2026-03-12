-- Create table for For You Page showcase items
CREATE TABLE public.fyp_showcases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL,
  short_description text NOT NULL,
  full_content text NOT NULL,
  image_url text NOT NULL,
  aspect_ratio numeric NOT NULL DEFAULT 1.0,
  cta_text text,
  cta_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fyp_showcases ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active showcases (public landing page)
CREATE POLICY "Anyone can view active showcases" 
ON public.fyp_showcases 
FOR SELECT 
USING (is_active = true);

-- Admins can manage all showcases
CREATE POLICY "Admins can manage all showcases" 
ON public.fyp_showcases 
FOR ALL 
USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true ))
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true ));

-- Insert initial showcase data
INSERT INTO public.fyp_showcases (title, type, short_description, full_content, image_url, aspect_ratio, display_order) VALUES
('Pre-Meeting Intelligence', 'Meetings', 'Get briefed before every meeting with context from Slack, docs, and your tools.', 
'## Never Walk Into a Meeting Unprepared

GIA automatically pulls together everything you need to know before any meeting on your calendar.

### What You Get
- **Participant Profiles**: Quick context on who you''re meeting with, including recent interactions and shared projects
- **Relevant Documents**: Any docs, slides, or files that have been shared in related conversations
- **Conversation History**: Key points from previous meetings with the same people
- **Action Items**: Outstanding tasks or commitments from past discussions

### How It Works
GIA monitors your calendar and begins preparing your brief 30 minutes before each meeting. You''ll receive a notification with a summary you can review in under 2 minutes.

No more scrambling to remember what was discussed last time or searching through emails for that one attachment.', 
'https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?auto=format&fit=crop&q=80&w=800', 1.2, 1),

('Company Knowledge Search', 'Knowledge', 'Find anything across all your tools, conversations, and documents instantly.',
'## Your Company''s Brain, Instantly Searchable

Stop asking "where did I see that?" GIA indexes everything across your connected tools and makes it searchable in seconds.

### Unified Search Across
- Slack messages and channels
- Google Drive and Dropbox files
- Notion pages and databases
- Email threads and attachments
- Meeting transcripts and notes

### Smart Results
GIA understands context. Search for "Q4 revenue projections" and get the actual spreadsheet, the Slack discussion about it, and the meeting where it was presented—all ranked by relevance.

### Privacy First
You only see results from conversations and files you already have access to. GIA respects your existing permissions.', 
'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=800', 0.9, 2),

('Smart Client Follow-ups', 'Communication', 'Never miss a follow-up with automatic reminders based on your conversations.',
'## Every Promise Kept, Automatically

GIA tracks commitments made in conversations and ensures nothing falls through the cracks.

### Intelligent Detection
When you say "I''ll send that over tomorrow" or "Let me check and get back to you," GIA picks up on these commitments and creates follow-up reminders.

### Contextual Reminders
- Get reminded at the right time based on your stated timeline
- See the original conversation for context
- One-click to mark complete or snooze

### Client Relationship Insights
Track your response patterns and follow-up rates. GIA helps you maintain the relationships that matter most.', 
'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800', 1.1, 3),

('Weekly Team Updates', 'Team', 'Get a summary of what everyone shipped this week, compiled automatically.',
'## Know What Your Team Accomplished Without the Meetings

Every Friday, GIA compiles a comprehensive summary of what your team shipped, decided, and planned.

### Automatic Compilation
GIA monitors:
- Completed tasks and closed tickets
- Merged pull requests and deployments
- Key decisions made in conversations
- Goals set and milestones hit

### Beautiful, Shareable Reports
Get a formatted update you can share with stakeholders, leadership, or the whole company. No more spending hours writing status reports.

### Trend Insights
See patterns over time—shipping velocity, common blockers, and team momentum.', 
'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800', 1.3, 4),

('Metrics Dashboard', 'Analytics', 'See all your important numbers in one place, pulled from every tool you use.',
'## One Dashboard for All Your Numbers

GIA connects to your tools and surfaces the metrics that matter, updated in real-time.

### Pull Data From Anywhere
- Revenue from Stripe
- Users from your analytics platform
- Tasks from project management tools
- Pipeline from your CRM

### Custom Views
Create dashboards for different audiences—executive summaries, team health metrics, or project-specific KPIs.

### Anomaly Detection
GIA alerts you when numbers look unusual, so you catch issues before they become problems.', 
'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800', 1.0, 5),

('Team Calendar', 'Planning', 'Know who''s out, who''s working on what, and when things are due.',
'## The Calendar Your Team Actually Needs

See availability, deadlines, and focus time across your entire team at a glance.

### Unified View
- PTO and holidays from HR systems
- Sprint milestones from project tools
- Focus time blocks from calendars
- Key deadlines and launches

### Smart Scheduling
Find the best time for team meetings based on everyone''s actual availability and focus preferences.

### Workload Balance
Spot when someone is overbooked before they burn out.', 
'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=800', 0.8, 6),

('Onboarding Buddy', 'Team', 'New hires get personalized guides based on how your team actually works.',
'## Onboarding That Actually Works

GIA learns how your team operates and creates personalized onboarding experiences for every new hire.

### Personalized Learning Paths
Based on their role, GIA curates:
- Relevant documentation to read first
- Key people to meet and why
- Common workflows and processes
- Tribal knowledge that isn''t written down

### Interactive Q&A
New hires can ask GIA questions and get answers sourced from your company''s actual conversations and documents.

### Progress Tracking
Know when someone is ramping up and when they might need extra support.', 
'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800', 1.2, 7),

('Expense Tracker', 'Finance', 'Receipts from emails and messages get logged automatically.',
'## Expenses That Track Themselves

GIA monitors your email and messages for receipts and invoices, logging them before you even think about it.

### Automatic Detection
- Flight and hotel confirmations
- Software subscription receipts
- Vendor invoices
- Reimbursable purchases

### Smart Categorization
GIA learns your expense categories and applies them automatically. Just review and submit.

### Policy Compliance
Get flagged if something might be out of policy before you submit.', 
'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800', 1.1, 8),

('Project Starter', 'Projects', 'Kick off new projects with docs, channels, and tasks set up instantly.',
'## New Projects, Zero Setup Time

Tell GIA about a new project and watch the infrastructure appear.

### Automatic Setup
- Slack channel with the right people invited
- Shared folder with template documents
- Project board with standard workflows
- Kickoff meeting scheduled

### Templates That Learn
GIA remembers what worked for similar projects and suggests improvements for next time.

### Consistency Across Teams
Ensure every project starts with the same solid foundation.', 
'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=800', 1.4, 9),

('Status Board', 'Team', 'Everyone stays aligned with real-time updates from all your projects.',
'## One View of Everything That Matters

A living dashboard that shows the real-time status of every project, automatically updated.

### Live Updates
- Pull request activity
- Deployment status
- Blocker alerts
- Milestone progress

### No Manual Updates
GIA pulls status from your actual tools. No more asking "what''s the status on X?" in meetings.

### Customizable Views
Different views for different stakeholders—detailed for teams, summary for leadership.', 
'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800', 1.0, 10),

('Client Portal', 'Communication', 'Give clients a custom space to see their project status and files.',
'## Professional Client Experience, Zero Extra Work

GIA creates branded portals for your clients with project updates and shared files.

### Automatic Updates
When you update your internal tools, the client portal reflects the changes automatically.

### Controlled Access
Share exactly what you want clients to see—progress updates, deliverables, and milestones.

### Professional Appearance
Branded with your logo and colors. Clients see a polished experience.', 
'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800', 1.1, 11),

('Meeting Notes', 'Meetings', 'Every call gets transcribed, summarized, and shared with your team.',
'## Meetings Captured, Automatically

GIA joins your calls, takes notes, and distributes summaries—so you can focus on the conversation.

### Complete Capture
- Full transcription with speaker identification
- AI-generated summary of key points
- Action items extracted automatically
- Decisions highlighted for easy reference

### Instant Distribution
Notes go to all participants immediately after the call, with highlights for items relevant to each person.

### Searchable Archive
Find "what did we decide about the launch date?" months later with a simple search.', 
'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=800', 1.3, 12);

-- Add update trigger
CREATE TRIGGER update_fyp_showcases_updated_at
BEFORE UPDATE ON public.fyp_showcases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();