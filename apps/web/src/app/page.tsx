export default function HomePage(): React.JSX.Element {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-text-subtle">
          map goes here
        </p>
        <p className="mt-3 max-w-md font-serif text-sm text-text-muted">
          Every AI datacenter and the grid that feeds it. Map renders in task 004.
        </p>
      </div>
    </div>
  );
}
