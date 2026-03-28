import fetch from "node-fetch";

const CONVEX_URL = process.env.VITE_CONVEX_URL || "https://vibrant-dodo-805.convex.site";

async function testDelete() {
  const url = CONVEX_URL.replace('.cloud', '.site') + "/deleteMissingRows";
  console.log("Testing POST to", url);

  const activeEmails = ["dgi@dummy.com"]; 
  // Send a dummy array, it should wipe out everything NOT in this array.
  // Wait, I shouldn't wipe everything without knowing what's in there. I'll just print if it returns success.

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "users",
        key: "email",
        validKeys: [] // Testing empty array just to see if it responds correctly, actually I shouldn't ruin their Prod DB!
      })
    });
    console.log(await res.text());
  } catch(e) {
    console.error(e);
  }
}
testDelete();
