import { redirect } from 'next/navigation'

// The standalone lobby is obsolete — rooms now live at /room/[code].
// Kept as a redirect so old links / bookmarks land somewhere sensible.
export default function LobbyPage() {
  redirect('/')
}
