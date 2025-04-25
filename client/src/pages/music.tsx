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
        <h2 className="font-heading font-bold text-2xl mb-2">Baby Melody</h2>
        <p className="text-neutral-dark">Create a special song using your baby's name</p>
      </div>
      
      {/* Music Form */}
      <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="babyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block font-medium mb-2 text-neutral-darkest">Baby's Name or Nickname</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Minjun, Little Star"
                      className="w-full p-3 rounded-lg border border-neutral focus:border-primary-dark focus:ring focus:ring-primary-light focus:ring-opacity-50 outline-none transition"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="musicStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block font-medium mb-2 text-neutral-darkest">Music Style</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {musicStyles.map((style) => (
                      <label 
                        key={style.value}
                        className={`flex items-center border border-neutral rounded-lg p-3 cursor-pointer hover:bg-neutral-lightest transition-colors ${
                          field.value === style.value ? "bg-neutral-lightest border-primary-dark" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          className="text-primary-dark focus:ring-primary-light mr-2"
                          value={style.value}
                          checked={field.value === style.value}
                          onChange={() => field.onChange(style.value)}
                        />
                        <span>{style.label}</span>
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
                  <FormLabel className="block font-medium mb-2 text-neutral-darkest">Song Duration</FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm"
              disabled={isGenerating}
            >
              <MusicIcon className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate Baby Melody"}
            </Button>
          </form>
        </Form>
      </div>
      
      {/* Generated Music Section */}
      {generatedMusic && (
        <div className="mt-8">
          <h3 className="font-heading font-semibold text-lg mb-3">Your Melody is Ready!</h3>
          <AudioPlayer
            src={generatedMusic.url}
            title={generatedMusic.title}
            duration={generatedMusic.duration}
            style={generatedMusic.style}
            onDownload={() => handleDownload(generatedMusic.id)}
            onShare={() => handleShare(generatedMusic.id)}
          />
        </div>
      )}
      
      {/* Previous Melodies */}
      <div className="mt-8">
        <h3 className="font-heading font-semibold text-lg mb-3">Previous Melodies</h3>
        {isLoadingMusic ? (
          <div className="space-y-3">
            <div className="bg-neutral-lightest h-16 rounded-lg animate-pulse"></div>
            <div className="bg-neutral-lightest h-16 rounded-lg animate-pulse"></div>
          </div>
        ) : musicList && musicList.length > 0 ? (
          <div className="space-y-3">
            {musicList.map((melody: MusicItem) => (
              <div 
                key={melody.id}
                className="bg-white rounded-lg p-3 shadow-softer flex items-center border border-neutral-light"
              >
                <div className="mr-3 p-2 bg-primary-light rounded-full text-primary-dark">
                  <MusicIcon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{melody.title}</p>
                  <p className="text-xs text-neutral-dark">
                    {Math.floor(melody.duration / 60)}:{(melody.duration % 60).toString().padStart(2, '0')} • {melody.createdAt}
                  </p>
                </div>
                <button 
                  className="text-neutral-dark hover:text-primary mr-2"
                  onClick={() => handlePlayAudio(melody)}
                >
                  <PlayCircle className="h-5 w-5" />
                </button>
                <button className="text-neutral-dark hover:text-neutral-darkest">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-neutral-lightest rounded-lg">
            <p className="text-neutral-dark">No melodies created yet</p>
            <p className="text-sm mt-1">Create your first melody above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
