import routes from '@/lib/routes';

export async function submitScore(Name: string, WPM: number) {
    try {
        const response = await fetch(routes.SUBMIT_SCORE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ Name, WPM }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit score');
        }

        return data.message; // Return updated leaderboard
    } catch (error) {
        console.error('Error submitting score:', error);
        return null;
    }
}
