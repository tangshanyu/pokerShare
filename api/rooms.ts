export default async function handler(request, response) {
  const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!API_KEY) {
    return response.status(500).json({ 
      error: "Missing Secret Key configuration on server." 
    });
  }

  try {
    // Call Liveblocks Management API
    const res = await fetch("https://api.liveblocks.io/v2/rooms", {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Liveblocks API error: ${res.statusText}`);
    }

    const data = await res.json();
    
    // Sort by last connection (newest first)
    // The API returns { data: [...] }
    const rooms = data.data.sort((a, b) => {
        return new Date(b.lastConnectionAt).getTime() - new Date(a.lastConnectionAt).getTime();
    });

    return response.status(200).json({ rooms });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to fetch rooms." });
  }
}