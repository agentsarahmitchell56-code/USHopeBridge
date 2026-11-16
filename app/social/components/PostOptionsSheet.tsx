"use client";

type Props = {
  postId: string;
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
  onCopy: () => void;
};

export default function PostOptionsSheet({ postId, saved, onClose, onSave, onCopy }: Props) {
  return (
    <div className="eaz-sheet-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="eaz-post-sheet" role="dialog" aria-modal="true" aria-labelledby="eaz-post-sheet-title">
        <div className="eaz-sheet-handle" />
        <h2 id="eaz-post-sheet-title">Post options</h2>
        <button type="button" onClick={onSave}>{saved ? "Remove from saved posts" : "Save post"}</button>
        <button type="button" onClick={onCopy}>Copy link</button>
        <button type="button" onClick={onClose}>Cancel</button>
        <span className="eaz-sheet-post-id" aria-hidden="true">{postId}</span>
      </section>
    </div>
  );
}
