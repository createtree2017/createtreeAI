import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { recordAbTestResult } from "@/lib/api";
import { ThumbsUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ABTestVariant {
  testId: string;
  variantId: string;
  name: string;
  promptTemplate: string;
  variables?: string[];
}

interface ABTestComparerProps {
  testId: string;
  variants: ABTestVariant[];
  originalImage: string;
  transformedImages: Record<string, string>;
  onVoteComplete: () => void;
}

export default function ABTestComparer({ 
  testId,
  variants,
  originalImage,
  transformedImages,
  onVoteComplete 
}: ABTestComparerProps) {
  const { toast } = useToast();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  // Mutation for recording user's preference
  const { mutate: recordPreference, isPending } = useMutation({
    mutationFn: (variantId: string) => recordAbTestResult({
      testId,
      selectedVariantId: variantId,
    }),
    onSuccess: () => {
      toast({
        title: "Thank you for your feedback!",
        description: "Your preference has been recorded.",
      });
      onVoteComplete();
    },
    onError: (error) => {
      toast({
        title: "Error recording your preference",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle the vote submission
  const handleVote = () => {
    if (selectedVariant) {
      recordPreference(selectedVariant);
    }
  };

  // If no variants or fewer than 2, don't render the comparison
  if (!variants || variants.length < 2) return null;

  return (
    <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light mt-8">
      <div className="text-center mb-5">
        <h3 className="font-heading font-semibold text-lg mb-2">Help Us Improve!</h3>
        <p className="text-neutral-dark text-sm">Which transformation do you prefer? Your feedback helps us create better memories.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {variants.map((variant) => (
          <Card 
            key={variant.variantId}
            className={`flex-1 overflow-hidden transition-all cursor-pointer ${
              selectedVariant === variant.variantId 
                ? 'ring-2 ring-primary shadow-md' 
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedVariant(variant.variantId)}
          >
            <div className="relative">
              {transformedImages[variant.variantId] ? (
                <img 
                  src={transformedImages[variant.variantId]} 
                  alt={variant.name} 
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-neutral-lightest flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral" />
                </div>
              )}
              
              {selectedVariant === variant.variantId && (
                <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                  <ThumbsUp className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="p-3 bg-white">
              <p className="font-medium text-sm">{variant.name}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleVote}
          disabled={!selectedVariant || isPending}
          className="bg-primary hover:bg-primary-dark text-white"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording...
            </>
          ) : (
            'Submit My Preference'
          )}
        </Button>
      </div>
    </div>
  );
}