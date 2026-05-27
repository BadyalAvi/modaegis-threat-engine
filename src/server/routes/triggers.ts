import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { redis, context, reddit, settings } from '@devvit/web/server';
import { createPost } from '../core/post';

export const triggers = new Hono();

// ----------------------------------------------------------------
// APP INSTALLATION WEBHOOK
// ----------------------------------------------------------------
triggers.post('/on-app-install', async (c) => {
  try {
    const post = await createPost();
    console.log(`🛡️ ModAAegis Installed! Defense Dashboard deployed at post ID: ${post.id}`);

    return c.json<TriggerResponse>(
      { status: 'success', message: `Dashboard deployed in ${context.subredditName}` },
      200
    );
  } catch (error) {
    console.error(`🚨 ModAAegis Deployment Error:`, error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Failed to deploy' }, 400);
  }
});

// ----------------------------------------------------------------
// 🛡️ THE GHOST AUTOPILOT & COMMENT WEBHOOK
// ----------------------------------------------------------------
triggers.post('/comment-submit', async (c) => {
  try {
    const payload = await c.req.json();
    const eventData = payload?.event || payload;
    
    let targetPostId = eventData?.comment?.postId || eventData?.post?.id;
    const authorName = eventData?.comment?.authorName || eventData?.author?.name;

    const [configuredThreshold, allowlistStr] = await Promise.all([
      settings.get<number>("threat_threshold"),
      settings.get<string>("trusted_allowlist")
    ]);

    // 1. 🛡️ SAFE HARBOR: THE ALLOWLIST CHECK
    if (authorName && allowlistStr) {
      const allowedUsers = allowlistStr.split(',').map(name => name.trim().toLowerCase());
      if (allowedUsers.includes(authorName.toLowerCase())) {
        console.log(`🕊️ SAFE HARBOR: Bypassing radar for trusted user: u/${authorName}`);
        return c.json({ status: 'success', message: 'User is allowlisted' }, 200);
      }
    }

    // 2. 🧠 HEURISTIC THREAT SCORING
    let threatWeight = 1; // Default point configuration for trusted/standard entities
    
    if (authorName) {
      try {
        const user = await reddit.getUserByUsername(authorName);
        
        // TypeScript Fix: Ensure the user actually exists before checking properties
        if (!user) throw new Error("User account is undefined, deleted, or shadowbanned.");

        // Calculate dynamic account age metrics
        const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        
        // Threat amplification gate for anomalous configurations
        if (accountAgeDays < 7 || user.commentKarma < 0) {
          threatWeight = 3;
          console.log(`⚠️ HEURISTIC ALERT: Suspicious account (u/${authorName}) detected. Threat weight multiplied by 3.`);
        }
      } catch (userError) {
        console.warn(`⚠️ Could not fetch heuristic user data for u/${authorName}. Defaulting to standard weight.`);
      }
    }

    // 3. Increment live velocity telemetry streams
    const currentCount = await redis.incrBy("active_threat_count", threatWeight);
    const previousCount = currentCount - threatWeight; 
    
    const baseThreshold = configuredThreshold || 3;
    const criticalThreshold = baseThreshold * 2;

    console.log(`📡 AUTOPILOT TRACKING: Score is ${currentCount} (+${threatWeight}). Critical trigger is ${criticalThreshold}.`);

    // 4. BULLETPROOF GHOST AUTOPILOT ENGINE LOGIC
    if (currentCount >= criticalThreshold && previousCount < criticalThreshold) {
      console.log(`🚨 CRITICAL THREAT DETECTED: Ghost Autopilot engaging...`);

      if (targetPostId) {
        if (targetPostId.startsWith('t3_')) targetPostId = targetPostId.substring(3);

        const post = await reddit.getPostById(targetPostId);
        await post.lock();
        
        await reddit.modMail.createConversation({
          subredditName: context.subredditName,
          subject: '🚨 ModAAegis Alert: Post Auto-Locked',
          body: `**ModAAegis Ghost Autopilot has engaged.**\n\nA critical spam burst (Threat Score: ${currentCount}) was detected. Heuristic analysis identified suspicious account activity.\n\nThe automated defense system has successfully locked Post ID: ${targetPostId} to contain the threat.`
        });
        console.log(`✉️ AUTOPILOT: Post locked and ModMail dispatched.`);
      }
    } 

    return c.json({ status: 'success' }, 200);
  } catch (error) {
    console.error("🚨 ModAAegis Engine Error:", error);
    return c.json({ status: 'error' }, 400);
  }
});

// ----------------------------------------------------------------
// 🛡️ NATIVE UI: CONTEXT MENU USER SCANNER
// ----------------------------------------------------------------
triggers.post('/internal/menu/scan-user', async (c) => {
  try {
    const payload = await c.req.json();
    const targetId = payload?.targetId;

    if (!targetId) {
      console.error("🚨 SCAN FAILED: No target ID provided.");
      return c.json({ status: 'error', message: 'Missing target ID' }, 400);
    }

    // Query comment components to identify the structural author
    const comment = await reddit.getCommentById(targetId);
    const authorName = comment.authorName;

    let accountAgeDays = 0;
    let karma = 0;
    let riskLevel = "LOW";
    let recommendation = "No immediate action required. User appears standard.";

    try {
      const user = await reddit.getUserByUsername(authorName);
      
      // TypeScript Fix: Ensure the user actually exists before checking properties
      if (!user) throw new Error("User account is undefined, deleted, or shadowbanned.");

      accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      karma = user.commentKarma;

      // Real-time Heuristic Threat evaluation
      if (accountAgeDays < 7 || karma < 0) {
        riskLevel = "CRITICAL";
        recommendation = "High probability of bot or burner account. Recommend immediate monitoring or purge.";
      } else if (accountAgeDays < 30) {
        riskLevel = "ELEVATED";
        recommendation = "Account is relatively new. Monitor for spam bursts.";
      }
    } catch (e) {
      console.warn(`⚠️ Could not fetch full profile for u/${authorName}`);
      recommendation = "Unable to fetch full profile. Account may be shadowbanned or deleted.";
      riskLevel = "UNKNOWN";
    }

    // Route the intelligence telemetry payload to ModMail
    await reddit.modMail.createConversation({
      subredditName: context.subredditName,
      subject: `🛡️ ModAAegis Intelligence Report: u/${authorName}`,
      body: `**Requested Heuristic Scan Complete.**\n\n**Target:** u/${authorName}\n**Account Age:** ${accountAgeDays} days\n**Comment Karma:** ${karma}\n\n**Calculated Risk Level:** ${riskLevel}\n**System Recommendation:** ${recommendation}\n\n*Scanned via Native UI Context Menu.*`
    });

    console.log(`📡 NATIVE SCAN: Intelligence report for u/${authorName} dispatched to ModMail.`);
    return c.json({ status: 'success' }, 200);

  } catch (error) {
    console.error("🚨 Native Scan Engine Error:", error);
    return c.json({ status: 'error', message: 'Internal Server Error' }, 500);
  }
});