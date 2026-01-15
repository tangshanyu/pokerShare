
export default async function handler(request, response) {
  const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!API_KEY) {
    return response.status(500).json({ 
      error: "Missing Secret Key configuration on server." 
    });
  }

  try {
    // HANDLE DELETE
    if (request.method === 'DELETE') {
        const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
        const roomId = searchParams.get('roomId');

        if (!roomId) {
            return response.status(400).json({ error: "Room ID is required" });
        }

        const res = await fetch(`https://api.liveblocks.io/v2/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${API_KEY}`,
            },
        });

        if (!res.ok) {
            throw new Error(`Failed to delete room: ${res.statusText}`);
        }

        return response.status(200).json({ success: true });
    }

    // HANDLE POST (Update Metadata - specifically Title)
    if (request.method === 'POST') {
        let body;
        try {
            body = await request.json();
        } catch (e) {
            body = request.body; // Fallback depending on body parsing middleware
        }
        
        const { roomId, title } = body;

        if (!roomId || !title) {
            return response.status(400).json({ error: "Room ID and Title are required" });
        }

        const res = await fetch(`https://api.liveblocks.io/v2/rooms/${roomId}/metadata`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title
            })
        });

        if (!res.ok) {
            throw new Error(`Failed to update metadata: ${res.statusText}`);
        }

        return response.status(200).json({ success: true });
    }

    // HANDLE GET (List Rooms)
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
    const rooms = data.data.sort((a, b) => {
        return new Date(b.lastConnectionAt).getTime() - new Date(a.lastConnectionAt).getTime();
    });

    return response.status(200).json({ rooms });
    
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
