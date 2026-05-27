import { Hono } from 'hono';
import { context, redis, reddit, settings } from '@devvit/web/server';
import type { RadarResponse, ErrorResponse } from '../../shared/api';

export const api = new Hono();

// ----------------------------------------------------------------
// 🛡️ ENTERPRISE SECURITY: ROLE-BASED ACCESS CONTROL (RBAC)
// ----------------------------------------------------------------
async function verifyModClearance(subredditName: string): Promise<{ authorized: boolean; username: string | null }> {
  const username = await reddit.getCurrentUsername();
  if (!username) return { authorized: false, username: null };

  // Fetch the live, official list of moderators for this specific subreddit
  const mods = await reddit.getModerators({ subredditName }).all();
  const isMod = mods.some(mod => mod.username === username);
  
  return { authorized: isMod, username };
}

// ----------------------------------------------------------------
// THREAT RADAR DATA STREAM
// ----------------------------------------------------------------
api.get('/radar', async (c) => {
  const { postId } = context;

  if (!postId) {
     return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, 400);
  }

  try {
    const [countStr, username, configuredThreshold] = await Promise.all([
      redis.get("active_threat_count"),
      reddit.getCurrentUsername(),
      settings.get<number>("threat_threshold"),
    ]);

    const spamCount = countStr ? parseInt(countStr) : 0;
    const highThreshold = configuredThreshold || 3;
    const mediumThreshold = Math.max(1, Math.floor(highThreshold / 2));

    let threatLevel: 'Low' | 'Medium' | 'High' = 'Low';

    if (spamCount >= highThreshold) threatLevel = 'High';
    else if (spamCount >= mediumThreshold) threatLevel = 'Medium';

    return c.json<RadarResponse>({
      type: 'radar_data',
      postId,
      spamCount,
      threatLevel,
      username: username ?? 'Moderator',
    });
  } catch (error) {
    console.error(`API Radar Error:`, error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to fetch radar data' }, 500);
  }
});

// ----------------------------------------------------------------
// PROTOCOL ALPHA: POST LOCKDOWN
// ----------------------------------------------------------------
api.post('/lockdown', async (c) => {
  const { postId, subredditName } = context;
  if (!postId || !subredditName) return c.json<ErrorResponse>({ status: 'error', message: 'Missing context' }, 400);

  try {
    // 🔒 RBAC GATEWAY
    const { authorized, username } = await verifyModClearance(subredditName);
    if (!authorized) {
      console.warn(`🛑 SECURITY BLOCK: Unauthorized Lockdown attempt by u/${username || 'Unknown'}`);
      return c.json<ErrorResponse>({ status: 'error', message: 'Access Denied: Moderator clearance required' }, 403);
    }

    const post = await reddit.getPostById(postId);
    await post.lock();
    
    const auditComment = await reddit.submitComment({
      id: postId,
      text: `🔒 **ModAAegis Containment Protocol**\n\nThis thread has been locked by the moderation team due to a high-velocity spam burst. The threat is currently contained.`
    });
    await auditComment.distinguish(true); 

    console.log(`🔒 PROTOCOL ALPHA ENGAGED: Post ${postId} locked and audited.`);
    return c.json({ status: 'success', message: 'Post locked successfully' }, 200);
  } catch (error) {
    console.error(`🚨 Lockdown Execution Error:`, error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to lock post' }, 500);
  }
});

// ----------------------------------------------------------------
// PROTOCOL BETA: PURGE & BAN
// ----------------------------------------------------------------
api.post('/purge', async (c) => {
  const { postId, subredditName } = context;
  if (!postId || !subredditName) return c.json<ErrorResponse>({ status: 'error', message: 'Missing context' }, 400);

  try {
    // 🔒 RBAC GATEWAY
    const { authorized, username } = await verifyModClearance(subredditName);
    if (!authorized) {
      console.warn(`🛑 SECURITY BLOCK: Unauthorized Purge attempt by u/${username || 'Unknown'}`);
      return c.json<ErrorResponse>({ status: 'error', message: 'Access Denied: Moderator clearance required' }, 403);
    }

    const commentsListing = await reddit.getComments({ postId, limit: 5 });
    const comments = await commentsListing.all();

    const latestComment = comments[0];
    if (!latestComment) return c.json({ status: 'error', message: 'No active threats found' }, 400);

    const attackerUsername = latestComment.authorName;

    for (const comment of comments) {
      if (comment.authorName === attackerUsername) {
        await comment.remove(true); 
      }
    }

    await reddit.banUser({
      subredditName,
      username: attackerUsername,
      reason: 'Automated Ban: Spam Burst Detected by ModAAegis Threat Engine',
      duration: 999,
    });

    const auditComment = await reddit.submitComment({
      id: postId,
      text: `☢️ **ModAAegis Audit Log**\n\n**Protocol Beta Executed.**\n\nA targeted spam burst was detected. The originating account [u/${attackerUsername}] has been permanently neutralized and all associated payloads have been surgically purged from this thread.`
    });
    await auditComment.distinguish(true);

    console.log(`☢️ PROTOCOL BETA: Target [${attackerUsername}] neutralized. Audit logged.`);
    return c.json({ status: 'success', message: 'Attacker purged and banned' }, 200);
  } catch (error) {
    console.error(`🚨 Purge Execution Error:`, error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to execute purge' }, 500);
  }
});

// ----------------------------------------------------------------
// PROTOCOL OMEGA: SYSTEM RESET
// ----------------------------------------------------------------
api.post('/reset', async (c) => {
  const { subredditName } = context;
  if (!subredditName) return c.json<ErrorResponse>({ status: 'error', message: 'Missing context' }, 400);

  try {
    // 🔒 RBAC GATEWAY
    const { authorized, username } = await verifyModClearance(subredditName);
    if (!authorized) {
      console.warn(`🛑 SECURITY BLOCK: Unauthorized Reset attempt by u/${username || 'Unknown'}`);
      return c.json<ErrorResponse>({ status: 'error', message: 'Access Denied: Moderator clearance required' }, 403);
    }

    await redis.del("active_threat_count");
    console.log(`🔄 PROTOCOL OMEGA: System reset executed. Radar cleared.`);
    return c.json({ status: 'success', message: 'Radar reset successfully' }, 200);
  } catch (error) {
    console.error(`🚨 Reset Execution Error:`, error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to reset radar' }, 500);
  }
});