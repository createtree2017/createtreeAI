import { ToastAction } from "@/components/ui/toast";
import { useToast as useToastUI } from "@/components/ui/use-toast";

export interface ToastOptions {
  title: string;
  description?: string;
  action?: React.ReactElement<typeof ToastAction>;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = useToastUI();

  const showToast = ({ title, description, action, variant = "default" }: ToastOptions) => {
    toast.toast({
      title,
      description,
      action,
      variant,
    });
  };

  return {
    toast: showToast,
  };
}