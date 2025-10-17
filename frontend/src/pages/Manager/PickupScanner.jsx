// QR PickupScanner feature removed. Keep a placeholder component to avoid route breaks.
export default function PickupScanner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-lg mx-auto bg-white shadow rounded-xl p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Pickup Scanner Removed</h1>
        <p className="text-gray-600 text-sm">
          The QR-based pickup verification feature has been disabled.
        </p>
      </div>
    </div>
  );
}
