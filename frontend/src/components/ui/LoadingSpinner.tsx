import { cn } from '@/lib/utils';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-20', className)}>
      <div className="w-8 h-8 border-2 border-gray-700 border-t-green-400 rounded-full animate-spin" />
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <p className="text-red-400 font-medium">Error loading data</p>
        <p className="text-gray-500 text-sm mt-1">{message}</p>
      </div>
    </div>
  );
}
