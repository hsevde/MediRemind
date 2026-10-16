type Props = {
  caregiverEmail: string;
};

export function Navbar({ caregiverEmail }: Props) {
  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg text-white">
            💊
          </span>
          <span className="text-xl font-extrabold text-primary">MediRemind – Aile Paneli</span>
        </div>
        <span className="text-sm text-gray-500">{caregiverEmail}</span>
      </div>
    </header>
  );
}
