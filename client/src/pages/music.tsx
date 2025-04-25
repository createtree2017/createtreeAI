import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { Music as MusicIcon, PlayCircle, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AudioPlayer } from "@/components/ui/audio-player";
import { generateMusic, getMusicList, downloadMedia, shareMedia } from "@/lib/api";

const formSchema = z.object({
  babyName: z.string().min(1, "Baby's name is required"),
  musicStyle: z.string().min(1, "Please select a music style"),
  duration: z.string().min(1, "Please select a duration"),
});

type FormValues = z.infer<typeof formSchema>;

interface MusicItem {
  id: number;
  title: string;
  duration: number;
  style: string;
  url: string;
  createdAt: string;
}

export default function Music() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [generatedMusic, setGeneratedMusic] = useState<MusicItem | null>(null);
  
  // Extract music ID from URL if any
  const query = new URLSearchParams(location.split("?")[1] || "");
  const musicId = query.get("id");
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      babyName: "",
      musicStyle: "lullaby",
      duration: "60",
    },
  });
  
  // Fetch music list
  const { data: musicList, isLoading: isLoadingMusic } = useQuery({
    queryKey: ["/api/music"],
    queryFn: getMusicList,
  });
  
  // Fetch individual music if ID is provided
  useEffect(() => {
    if (musicId && musicList) {
      const foundMusic = musicList.find((item: MusicItem) => item.id === Number(musicId));
      if (foundMusic) {
        setGeneratedMusic(foundMusic);
      }
    }
  }, [musicId, musicList]);
  
  // Generate music mutation
  const { mutate: generateMusicMutation, isPending: isGenerating } = useMutation({
    mutationFn: (data: { babyName: string; style: string; duration: number }) => generateMusic(data),
    onSuccess: (data) => {
      setGeneratedMusic(data);
      queryClient.invalidateQueries({ queryKey: ["/api/music"] });
      toast({
        title: "Success!",
        description: "Your melody has been created",
      });
    },
    onError: (error) => {
      toast({
        title: "Error generating music",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: FormValues) => {
    generateMusicMutation({
      babyName: values.babyName,
      style: values.musicStyle,
      duration: parseInt(values.duration),
    });
  };
  
  const handleDownload = (id: number) => {
    downloadMedia(id, "music");
  };
  
  const handleShare = async (id: number) => {
    try {
      const shareData = await shareMedia(id, "music");
      // Implement sharing logic based on the response
      toast({
        title: "Share link created",
        description: "Ready to share your melody!",
      });
    } catch (error) {
      toast({
        title: "Error creating share link",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };
  
  const handlePlayAudio = (musicItem: MusicItem) => {
    setGeneratedMusic(musicItem);
  };
  
  // Music styles data
  const musicStyles = [
    { value: "lullaby", label: "Lullaby" },
    { value: "playful", label: "Playful" },
    { value: "classical", label: "Classical" },
    { value: "nature", label: "Nature Sounds" },
  ];
  
  // Duration options
  const durationOptions = [
    { value: "30", label: "30 seconds" },
    { value: "60", label: "1 minute" },
    { value: "120", label: "2 minutes" },
    { value: "180", label: "3 minutes" },
  ];
  
  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">Lullaby Creator</h2>
        <p className="text-neutral-dark">Create a personalized song that carries your baby's name and love</p>
      </div>
      
      {/* Music Form */}
      <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light overflow-hidden relative">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary-light/20 rounded-full"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary-light/10 rounded-full"></div>
        
        <div className="text-center mb-6 relative">
          <div className="inline-block p-3 bg-primary-light/30 rounded-full mb-3">
            <MusicIcon className="h-6 w-6 text-primary-dark" />
          </div>
          <h3 className="font-heading font-semibold text-lg text-primary-dark">Create a Musical Memory</h3>
          <p className="text-sm text-neutral-dark mt-1 max-w-md mx-auto">
            Our AI will compose a beautiful melody featuring your baby's name - perfect for bedtime or bonding moments
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 relative">
            <FormField
              control={form.control}
              name="babyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block font-medium mb-2 text-neutral-darkest">
                    Baby's Name or Nickname
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Minjun, Little Star, Baby Bean"
                      className="w-full p-3 rounded-lg border border-neutral focus:border-primary-dark focus:ring focus:ring-primary-light focus:ring-opacity-50 outline-none transition"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-neutral-dark mt-1">
                    This name will be repeated in the lullaby to create a personal connection
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="musicStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block font-medium mb-2 text-neutral-darkest">
                    Music Style
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {musicStyles.map((style) => (
                      <label 
                        key={style.value}
                        className={`flex flex-col items-center border border-neutral rounded-xl p-4 cursor-pointer hover:bg-neutral-lightest transition-colors ${
                          field.value === style.value ? "bg-primary-light/20 border-primary shadow-sm" : ""
                        }`}
                      >
                        <div className={`p-2 rounded-full mb-2 ${
                          field.value === style.value ? "bg-primary-light text-primary-dark" : "bg-neutral-lightest text-neutral-dark"
                        }`}>
                          {style.value === "lullaby" && <span className="block text-lg">🌙</span>}
                          {style.value === "playful" && <span className="block text-lg">🎪</span>}
                          {style.value === "classical" && <span className="block text-lg">🎻</span>}
                          {style.value === "nature" && <span className="block text-lg">🌿</span>}
                        </div>
                        <input
                          type="radio"
                          className="sr-only"
                          value={style.value}
                          checked={field.value === style.value}
                          onChange={() => field.onChange(style.value)}
                        />
                        <span className="font-medium text-center">{style.label}</span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block font-medium mb-2 text-neutral-darkest">
                    Song Duration
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full p-3 rounded-lg border border-neutral focus:border-primary-dark focus:ring focus:ring-primary-light focus:ring-opacity-50 outline-none transition">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {durationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-dark mt-1">
                    Shorter songs are perfect for quick moments, longer ones for naptime
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3.5 px-4 rounded-lg transition-colors shadow-md"
                disabled={isGenerating}
              >
                <MusicIcon className="mr-2 h-4 w-4" />
                {isGenerating ? "Creating your lullaby..." : "Create Baby's Lullaby"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
      
      {/* Generated Music Section */}
      {generatedMusic && (
        <div className="mt-8">
          <div className="flex items-center mb-3">
            <h3 className="font-heading font-semibold text-lg">Your Baby's Lullaby</h3>
            <div className="ml-2 bg-primary-light rounded-full px-2 py-0.5">
              <span className="text-xs font-medium text-primary-dark">New</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light">
            <div className="text-center mb-4">
              <h4 className="font-medium text-lg">{generatedMusic.title}</h4>
              <p className="text-sm text-neutral-dark">A special melody for your little one</p>
            </div>
            
            <AudioPlayer
              src={generatedMusic.url}
              title={generatedMusic.title}
              duration={generatedMusic.duration}
              style={generatedMusic.style}
              onDownload={() => handleDownload(generatedMusic.id)}
              onShare={() => handleShare(generatedMusic.id)}
            />
            
            <div className="mt-4 text-center">
              <p className="text-sm text-neutral-dark">
                This lullaby was created specially for your baby. Play it during bedtime, quiet time, or any moment you want to create a special memory together.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Previous Lullabies */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading font-semibold text-lg">Your Lullaby Collection</h3>
          {musicList && musicList.length > 0 && (
            <span className="text-xs bg-neutral-lightest rounded-full px-3 py-1 text-neutral-dark">
              {musicList.length} lullabies
            </span>
          )}
        </div>
        
        {isLoadingMusic ? (
          <div className="space-y-3">
            <div className="bg-neutral-lightest h-20 rounded-xl animate-pulse"></div>
            <div className="bg-neutral-lightest h-20 rounded-xl animate-pulse"></div>
          </div>
        ) : musicList && musicList.length > 0 ? (
          <div className="space-y-3">
            {musicList.map((melody: MusicItem) => (
              <div 
                key={melody.id}
                className="bg-white rounded-xl p-4 shadow-soft flex items-center border border-neutral-light hover:shadow-md transition-shadow"
              >
                <div className="mr-4 p-3 bg-primary-light/30 rounded-full text-primary-dark">
                  <MusicIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{melody.title}</p>
                  <div className="flex items-center text-xs text-neutral-dark mt-1">
                    <span className="bg-neutral-lightest rounded-full px-2 py-0.5 mr-2">
                      {melody.style}
                    </span>
                    <span>
                      {Math.floor(melody.duration / 60)}:{(melody.duration % 60).toString().padStart(2, '0')} • {melody.createdAt}
                    </span>
                  </div>
                </div>
                <button 
                  className="mr-3 p-2 rounded-full text-neutral-dark hover:text-primary hover:bg-primary-light/20 transition-colors"
                  onClick={() => handlePlayAudio(melody)}
                  title="Play lullaby"
                >
                  <PlayCircle className="h-6 w-6" />
                </button>
                <button 
                  className="p-2 rounded-full text-neutral-dark hover:text-neutral-darkest hover:bg-neutral-lightest transition-colors"
                  title="More options"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-neutral-lightest rounded-xl border border-dashed border-neutral-light">
            <MusicIcon className="h-8 w-8 mx-auto mb-2 text-neutral" />
            <p className="text-neutral-dark font-medium">No lullabies created yet</p>
            <p className="text-sm mt-1 mb-4 text-neutral-dark">Create your first lullaby to begin your collection</p>
            <Button
              variant="outline"
              size="sm"
              className="bg-white hover:bg-neutral-lightest"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Create a Lullaby
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
