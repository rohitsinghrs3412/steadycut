"use client";

export default function SentryExamplePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-2xl font-semibold">Sentry Test</h1>
        <button
          type="button"
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          onClick={() => {
            throw new Error("Sentry Test Error");
          }}
        >
          Throw Sample Error
        </button>
      </div>
    </main>
  );
}
