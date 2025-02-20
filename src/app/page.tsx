[web - v2 / src / app / page.tsx]
'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.scss';

interface Track {
  name: string;
  explicit: boolean;
  playedAt: string;
  themes: string;
}

interface Playlist {
  name: string;
  tracks: string[];
}

interface Lyrics {
  text: string;
  problematic: string[];
}

export default function Dashboard() {
  const [report, setReport] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    if (code && !token) {
      fetch(`${backendUrl}/auth/callback?code=${code}`)
        .then(res => res.json())
        .then(data => {
          setToken(data.access_token);
          window.history.replaceState({}, document.title, '/');
        })
        .catch(() => setError('OAuth failed'));
    } else if (!token) {
      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
      const redirectUri = 'http://localhost:3001';
      const scope = 'user-read-recently-played';
      window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    const fetchData = async () => {
      setLoading(true);
      try {
        const reportRes = await fetch(`${backendUrl}/report?accessToken=${token}&dateFilter=${dateFilter}`, { cache: 'no-store' });
        if (!reportRes.ok) throw new Error('Report fetch failed');
        setReport(await reportRes.json());

        const playlistRes = await fetch(`${backendUrl}/playlists?accessToken=${token}`, { cache: 'no-store' });
        if (!playlistRes.ok) throw new Error('Playlist fetch failed');
        setPlaylists(await playlistRes.json());
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, dateFilter]);

  useEffect(() => {
    if (!selectedTrack || !token) return;
    const fetchLyrics = async () => {
      const response = await fetch(`http://localhost:3001/lyrics?accessToken=${token}&track=${encodeURIComponent(selectedTrack.name)}`);
      if (response.ok) setLyrics(await response.json());
    };
    fetchLyrics();
  }, [selectedTrack, token]);

  const highlightLyrics = (text: string, problematic: string[]) => {
    let highlighted = text;
    problematic.forEach(word => {
      highlighted = highlighted.replace(new RegExp(`\\b${word}\\b`, 'gi'), `<span class="${styles.problematic}">${word}</span>`);
    });
    return { __html: highlighted };
  };

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>CleanBeats Monitor</h1>
      <p className={styles.subtitle}>For parents only. Monitor and curate Spotify for your teen.</p>

      {loading && <p className={styles.loading}>Loading...</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.container}>
        <div className={styles.leftPanel}>
          <div className={styles.filter}>
            <label>Filter by Date: </label>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last Week</option>
            </select>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent Playback Report</h2>
            <ul className={styles.list}>
              {report.length > 0 ? (
                report.map((track, index) => (
                  <li
                    key={index}
                    className={`${styles.listItem} ${selectedTrack?.name === track.name ? styles.selected : ''}`}
                    onClick={() => setSelectedTrack(track)}
                  >
                    {track.name} - {track.explicit ? "Explicit" : "Clean"}
                    (Played: {new Date(track.playedAt).toLocaleString()}) - Themes: {track.themes}
                  </li>
                ))
              ) : (
                !loading && <li className={styles.listItem}>No recent tracks found.</li>
              )}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>PG-13 Playlists</h2>
            <ul className={styles.list}>
              {playlists.length > 0 ? (
                playlists.map((playlist, index) => (
                  <li key={index} className={styles.listItem}>
                    {playlist.name}: {playlist.tracks.join(", ")}
                  </li>
                ))
              ) : (
                !loading && <li className={styles.listItem}>No playlists available.</li>
              )}
            </ul>
          </section>
        </div>

        <div className={styles.rightPanel}>
          <h2 className={styles.sectionTitle}>Lyrics</h2>
          {selectedTrack && lyrics ? (
            <div
              className={styles.lyrics}
              dangerouslySetInnerHTML={highlightLyrics(lyrics.text, lyrics.problematic)}
            />
          ) : (
            <p>Select a track to view lyrics.</p>
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <p>Non-commercial tool for parental use only. No playback control.</p>
      </footer>
    </main>
  );
}