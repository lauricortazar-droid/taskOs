import React, { useState, useEffect } from "react";
import {
  Music,
  Disc,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Radio,
  Sparkles,
  Link2,
  HardDrive,
  X,
} from "lucide-react";
import { MusicPlatform, WorkPlaylist } from "../types";
import { playChime } from "../utils/audio";

const STORAGE_KEY_MUSIC_STATE = "task_os_work_music_v1";
const STORAGE_KEY_CUSTOM_PLAYLISTS = "task_os_custom_playlists_v1";

const DEFAULT_PRESETS: WorkPlaylist[] = [
  // Spotify Presets
  {
    id: "spot-deep-focus",
    title: "Deep Focus (Instrumental & Ambient)",
    platform: "spotify",
    url: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0",
    description: "Música instrumental serena para concentración profunda sin distracciones.",
  },
  {
    id: "spot-lofi-beats",
    title: "Lo-Fi Beats para Trabajar",
    platform: "spotify",
    url: "https://open.spotify.com/playlist/37i9dQZF1DXc8kgYqQLMfH",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXc8kgYqQLMfH?utm_source=generator&theme=0",
    description: "Ritmos suaves lofi ideales para tareas de diseño y redacción.",
  },
  {
    id: "spot-piano-focus",
    title: "Peaceful Piano Clásico",
    platform: "spotify",
    url: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO?utm_source=generator&theme=0",
    description: "Piezas de piano relajantes para máxima claridad mental.",
  },
  // YouTube Music Presets
  {
    id: "yt-lofi-live",
    title: "Lofi Girl — Beats to Relax/Study to",
    platform: "youtube",
    url: "https://music.youtube.com/watch?v=jfKfPfyJRdk",
    embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=0",
    description: "Transmisión continua de lofi chill hip-hop para trabajar.",
  },
  {
    id: "yt-classical-focus",
    title: "Música Clásica para Alta Concentración",
    platform: "youtube",
    url: "https://music.youtube.com/watch?v=WPni755-Krg",
    embedUrl: "https://www.youtube.com/embed/WPni755-Krg?autoplay=1",
    description: "Mozart, Bach y Chopin seleccionados para potenciar el enfoque.",
  },
  {
    id: "yt-ambient-synth",
    title: "Synthwave / Chillwave Productivo",
    platform: "youtube",
    url: "https://music.youtube.com/watch?v=4xDzrJKXOOY",
    embedUrl: "https://www.youtube.com/embed/4xDzrJKXOOY?autoplay=1",
    description: "Atmósferas electrónicas retro y suaves de alta productividad.",
  },
  // Google Drive Presets / Templates
  {
    id: "gdrive-sample",
    title: "Mi Audio de Trabajo (Google Drive)",
    platform: "gdrive",
    url: "https://drive.google.com",
    embedUrl: "",
    description: "Pega el enlace de tu archivo de audio en Google Drive para reproducirlo aquí.",
    isCustom: true,
  },
];

interface WorkMusicPlayerProps {
  isPomodoroActive?: boolean;
}

export default function WorkMusicPlayer({ isPomodoroActive }: WorkMusicPlayerProps) {
  const [isBarOpen, setIsBarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<MusicPlatform>("spotify");
  const [currentPlaylist, setCurrentPlaylist] = useState<WorkPlaylist>(DEFAULT_PRESETS[0]);
  const [customPlaylists, setCustomPlaylists] = useState<WorkPlaylist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_PLAYLISTS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  // New playlist form
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState<MusicPlatform>("spotify");
  const [gdriveAudioUrl, setGdriveAudioUrl] = useState<string>("");

  // Load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MUSIC_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentPlaylist) {
          setCurrentPlaylist(parsed.currentPlaylist);
          setActivePlatform(parsed.currentPlaylist.platform);
        }
      }
    } catch (_) {}
  }, []);

  // Save state on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_MUSIC_STATE,
        JSON.stringify({
          currentPlaylist,
          activePlatform,
        })
      );
    } catch (_) {}
  }, [currentPlaylist, activePlatform]);

  const allPlaylists = [...DEFAULT_PRESETS, ...customPlaylists];
  const filteredPlaylists = allPlaylists.filter((p) => p.platform === activePlatform);

  // Helper to convert any Spotify / YouTube / Google Drive link into an embed URL
  const parseEmbedUrl = (url: string, platform: MusicPlatform): { embedUrl: string; directUrl: string } => {
    const cleanUrl = url.trim();

    if (platform === "spotify") {
      // spotify:playlist:xxx or https://open.spotify.com/playlist/xxx or album/track
      const match = cleanUrl.match(/(playlist|track|album|show|episode)\/([a-zA-Z0-9]+)/);
      if (match) {
        const type = match[1];
        const id = match[2];
        return {
          embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
          directUrl: cleanUrl,
        };
      }
      return { embedUrl: cleanUrl, directUrl: cleanUrl };
    }

    if (platform === "youtube") {
      // YouTube or YouTube Music playlist / watch url
      let videoId = "";
      let listId = "";

      const listMatch = cleanUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (listMatch) listId = listMatch[1];

      const videoMatch = cleanUrl.match(/(?:watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      if (videoMatch) videoId = videoMatch[1];

      if (listId) {
        return {
          embedUrl: `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1`,
          directUrl: cleanUrl,
        };
      }
      if (videoId) {
        return {
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
          directUrl: cleanUrl,
        };
      }
      return { embedUrl: cleanUrl, directUrl: cleanUrl };
    }

    if (platform === "gdrive") {
      // Google Drive file: https://drive.google.com/file/d/FILE_ID/view...
      const match = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (match) {
        const fileId = match[1];
        // Stream direct audio or preview iframe
        return {
          embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
          directUrl: cleanUrl,
        };
      }
      return { embedUrl: cleanUrl, directUrl: cleanUrl };
    }

    return { embedUrl: cleanUrl, directUrl: cleanUrl };
  };

  const handleAddCustomPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    const { embedUrl, directUrl } = parseEmbedUrl(newUrl, newPlatform);

    const newPl: WorkPlaylist = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      platform: newPlatform,
      url: directUrl,
      embedUrl: embedUrl,
      description: `Playlist personalizada de ${newPlatform.toUpperCase()}`,
      isCustom: true,
    };

    const updated = [newPl, ...customPlaylists];
    setCustomPlaylists(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PLAYLISTS, JSON.stringify(updated));
    } catch (_) {}

    setCurrentPlaylist(newPl);
    setActivePlatform(newPlatform);
    setNewTitle("");
    setNewUrl("");
    playChime("success");
  };

  const handleDeleteCustomPlaylist = (id: string) => {
    const updated = customPlaylists.filter((p) => p.id !== id);
    setCustomPlaylists(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PLAYLISTS, JSON.stringify(updated));
    } catch (_) {}
    if (currentPlaylist.id === id) {
      setCurrentPlaylist(DEFAULT_PRESETS[0]);
    }
  };

  const selectPlaylist = (pl: WorkPlaylist) => {
    setCurrentPlaylist(pl);
    setIsBarOpen(true);
    playChime("tick");
  };

  return (
    <>
      {/* Floating Mini Music Bar in bottom right corner */}
      <div
        id="work-music-floating-widget"
        className="fixed bottom-16 sm:bottom-4 right-3 sm:right-5 z-40 flex flex-col items-end"
      >
        {isBarOpen ? (
          <div className="w-80 sm:w-96 bg-stone-900 text-stone-100 dark:bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
            {/* Header bar */}
            <div className="p-3 bg-stone-800/90 border-b border-stone-700/70 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Disc size={16} className="animate-spin" style={{ animationDuration: "6s" }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold truncate">{currentPlaylist.title}</span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                        currentPlaylist.platform === "spotify"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : currentPlaylist.platform === "youtube"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {currentPlaylist.platform}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 truncate">{currentPlaylist.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 transition-colors"
                  title="Cambiar Playlist o Plataforma (Spotify, YouTube Music, Google Drive)"
                >
                  <Music size={15} />
                </button>
                <a
                  href={currentPlaylist.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 transition-colors"
                  title="Abrir en pestaña nueva / App externa"
                >
                  <ExternalLink size={15} />
                </a>
                <button
                  type="button"
                  onClick={() => setIsBarOpen(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700 transition-colors"
                  title="Minimizar reproductor"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* Embedded Player Body */}
            <div className="p-2 bg-stone-950/90">
              {currentPlaylist.platform === "spotify" && (
                <iframe
                  src={currentPlaylist.embedUrl}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-xl shadow-inner"
                  title="Spotify Focus Player"
                />
              )}

              {currentPlaylist.platform === "youtube" && (
                <div className="relative rounded-xl overflow-hidden aspect-video max-h-48 w-full bg-black">
                  <iframe
                    src={currentPlaylist.embedUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                    title="YouTube Music Focus Player"
                  />
                </div>
              )}

              {currentPlaylist.platform === "gdrive" && (
                <div className="p-3 space-y-2 bg-stone-900/90 rounded-xl text-center">
                  <HardDrive size={24} className="text-blue-400 mx-auto" />
                  <p className="text-xs text-stone-300 font-medium">Google Drive Audio</p>
                  {currentPlaylist.embedUrl ? (
                    <iframe
                      src={currentPlaylist.embedUrl}
                      width="100%"
                      height="90"
                      className="rounded-lg border border-stone-700"
                      title="Google Drive Player"
                    />
                  ) : (
                    <p className="text-[11px] text-stone-400">
                      Pega el link de un archivo de audio de Google Drive desde el selector de playlists.
                    </p>
                  )}
                  <a
                    href={currentPlaylist.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    <ExternalLink size={13} />
                    Abrir en Google Drive
                  </a>
                </div>
              )}
            </div>

            {/* Quick footer switch bar */}
            <div className="p-2 bg-stone-900 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-stone-300 hover:text-amber-400 flex items-center gap-1 font-medium transition-colors"
              >
                <Radio size={13} />
                <span>Explorar listas</span>
              </button>
              <span className="text-[10px] text-stone-500">Task-OS Focus Sound</span>
            </div>
          </div>
        ) : (
          /* Minimized pill trigger */
          <button
            type="button"
            id="open-work-music-pill-btn"
            onClick={() => {
              setIsBarOpen(true);
              playChime("tick");
            }}
            className="group flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-stone-900 text-stone-100 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white shadow-xl border border-stone-700 dark:border-stone-300 transition-all transform hover:scale-105 min-h-[44px]"
            title="Abrir música de trabajo (Spotify / YouTube Music / Google Drive)"
          >
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-600 flex items-center justify-center">
              <Disc size={15} className="group-hover:animate-spin" style={{ animationDuration: "3s" }} />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold leading-none">Música de Enfoque</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="text-[10px] text-stone-400 dark:text-stone-600 leading-none">
                {currentPlaylist.platform === "spotify"
                  ? "Spotify"
                  : currentPlaylist.platform === "youtube"
                  ? "YouTube Music"
                  : "Google Drive"}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Playlist Selector & Custom URL Modal */}
      {isModalOpen && (
        <div
          id="music-playlist-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            id="music-playlist-modal"
            className="relative w-full max-w-xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Music size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                    Música de Enfoque y Trabajo
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Elige o agrega tu playlist de Spotify, YouTube Music o Google Drive
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Platform Filter Tabs */}
            <div className="p-3 bg-stone-100 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800">
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setActivePlatform("spotify")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
                    activePlatform === "spotify"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white"
                  }`}
                >
                  <Disc size={15} />
                  <span>Spotify</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform("youtube")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
                    activePlatform === "youtube"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white"
                  }`}
                >
                  <Radio size={15} />
                  <span>YouTube Music</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform("gdrive")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
                    activePlatform === "gdrive"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white"
                  }`}
                >
                  <HardDrive size={15} />
                  <span>Google Drive</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Add Custom Playlist Form */}
              <form
                onSubmit={handleAddCustomPlaylist}
                className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <Plus size={14} className="text-amber-500" />
                    Añadir mi propia Playlist o Enlace
                  </span>
                  <span className="text-[11px] text-stone-500">
                    {activePlatform === "spotify"
                      ? "Spotify Link"
                      : activePlatform === "youtube"
                      ? "YouTube Music / Playlist Link"
                      : "Google Drive Share Link"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Nombre (ej. Mi Lofi Secreto, Audios Drive...)"
                    className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder={
                      activePlatform === "spotify"
                        ? "https://open.spotify.com/playlist/..."
                        : activePlatform === "youtube"
                        ? "https://music.youtube.com/watch?v=... o playlist"
                        : "https://drive.google.com/file/d/.../view"
                    }
                    className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-stone-400">
                    Se guarda en tu perfil y estará disponible en todos tus dispositivos.
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 text-xs font-bold hover:opacity-90 transition-opacity min-h-[40px]"
                  >
                    Guardar Playlist
                  </button>
                </div>
              </form>

              {/* Available Playlists List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  Listas Disponibles ({activePlatform.toUpperCase()})
                </h4>

                <div className="grid grid-cols-1 gap-2.5">
                  {filteredPlaylists.map((pl) => {
                    const isSelected = currentPlaylist.id === pl.id;
                    return (
                      <div
                        key={pl.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 dark:border-amber-600/70 shadow-xs"
                            : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              pl.platform === "spotify"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : pl.platform === "youtube"
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {isSelected ? (
                              <Disc size={20} className="animate-spin" style={{ animationDuration: "5s" }} />
                            ) : (
                              <Play size={18} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                                {pl.title}
                              </h5>
                              {pl.isCustom && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-semibold">
                                  Personalizada
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                              {pl.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={pl.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="Abrir en pestaña nueva"
                          >
                            <ExternalLink size={16} />
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              selectPlaylist(pl);
                              setIsModalOpen(false);
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-amber-500 text-stone-950 shadow-xs"
                                : "bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 hover:opacity-90"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Disc size={13} className="animate-spin" />
                                <span>Activa</span>
                              </>
                            ) : (
                              <>
                                <Play size={13} />
                                <span>Reproducir</span>
                              </>
                            )}
                          </button>

                          {pl.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomPlaylist(pl.id)}
                              className="p-2 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title="Eliminar esta playlist personalizada"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-stone-100/70 dark:bg-stone-900/90 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                Audio optimizado para flujo mental y sesiones Pomodoro
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold hover:bg-stone-300 dark:hover:bg-stone-700 min-h-[40px]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
