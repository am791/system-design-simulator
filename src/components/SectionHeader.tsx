import type { ComponentId } from "../data/ComponentInfo";

function InfoIcon(props: { size?: number }) {
  const size = props.size ?? 16;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-18a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M12 10.6a1 1 0 0 0-1 1V17a1 1 0 0 0 2 0v-5.4a1 1 0 0 0-1-1Zm0-3.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function SectionHeader(props: {
  title: string;
  description?: string;
  infoId: ComponentId;
  onOpenInfo: (id: ComponentId) => void;
}) {
  const { title, description, infoId, onOpenInfo } = props;

  return (
    <div className="sectionHeader">
      <div>
        <div className="h2" style={{ marginBottom: 4 }}>{title}</div>
        {description ? <div className="p" style={{ margin: 0 }}>{description}</div> : null}
      </div>

      <button
        className="sectionInfoBtn"
        onClick={() => onOpenInfo(infoId)}
        title={`About ${title}`}
        aria-label={`Open info for ${title}`}
      >
        <InfoIcon />
      </button>
    </div>
  );
}
