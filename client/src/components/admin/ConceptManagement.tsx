import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Concept, ConceptCategory } from "@shared/schema";
import { Loader2, Plus, Trash, Edit, Image, ArrowUpCircle } from "lucide-react";

export default function ConceptManagement() {
  const [newConcept, setNewConcept] = useState({
    conceptId: "",
    title: "",
    description: "",
    promptTemplate: "",
    systemPrompt: "",
    thumbnailUrl: "",
    categoryId: "",
    usePhotoMaker: false,
    referenceImageUrl: "",
    photoMakerPrompt: "",
    photoMakerNegativePrompt: "",
    photoMakerStrength: "1.0"
  });
  
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  const [conceptDialogOpen, setConceptDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conceptToDelete, setConceptToDelete] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 컨셉 카테고리 조회
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery<ConceptCategory[]>({
    queryKey: ['/api/concept-categories'],
    enabled: true
  });

  // 컨셉 목록 조회
  const { data: concepts = [], isLoading: isConceptsLoading } = useQuery<Concept[]>({
    queryKey: ['/api/concepts'],
    enabled: true
  });

  // 컨셉 추가/수정 뮤테이션
  const saveConceptMutation = useMutation({
    mutationFn: async (concept: any) => {
      // 새 컨셉 또는 기존 컨셉 업데이트 여부 확인
      const isNew = !editingConcept;
      let url = '/api/admin/concepts';
      let method = 'POST';
      
      if (!isNew) {
        url = `/api/admin/concepts/${concept.conceptId}`;
        method = 'PUT';
      }
      
      // 썸네일 이미지 업로드
      if (thumbnailFile) {
        const thumbnailUrl = await uploadImage(thumbnailFile, 'thumbnail');
        concept.thumbnailUrl = thumbnailUrl;
      }
      
      // 레퍼런스 이미지 업로드 (PhotoMaker 모드용)
      if (referenceFile) {
        const referenceUrl = await uploadImage(referenceFile, 'reference');
        concept.referenceImageUrl = referenceUrl;
      }
      
      return apiRequest(url, { method, data: concept });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/concepts'] });
      toast({
        title: editingConcept ? "컨셉 업데이트 완료" : "새 컨셉 추가 완료",
        description: "컨셉이 성공적으로 저장되었습니다."
      });
      setConceptDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("컨셉 저장 중 오류 발생:", error);
      toast({
        title: "오류 발생",
        description: "컨셉을 저장하는 중에 문제가 발생했습니다. 다시 시도해 주세요.",
        variant: "destructive"
      });
    }
  });

  // 컨셉 삭제 뮤테이션
  const deleteConceptMutation = useMutation({
    mutationFn: (conceptId: string) => {
      return apiRequest(`/api/admin/concepts/${conceptId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/concepts'] });
      toast({
        title: "컨셉 삭제 완료",
        description: "컨셉이 성공적으로 삭제되었습니다."
      });
      setDeleteDialogOpen(false);
      setConceptToDelete(null);
    },
    onError: (error) => {
      console.error("컨셉 삭제 중 오류 발생:", error);
      toast({
        title: "오류 발생",
        description: "컨셉을 삭제하는 중에 문제가 발생했습니다. 다시 시도해 주세요.",
        variant: "destructive"
      });
    }
  });

  // 이미지 업로드 함수 (썸네일 및 레퍼런스 이미지용)
  const uploadImage = async (file: File, type: 'thumbnail' | 'reference') => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append(type, file);
      
      const response = await fetch(`/api/admin/upload/${type}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`이미지 업로드 실패: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error(`${type} 이미지 업로드 중 오류:`, error);
      toast({
        title: "이미지 업로드 실패",
        description: "이미지를 업로드하는 중에 오류가 발생했습니다.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // 컨셉 수정 시작
  const handleEditConcept = (concept: Concept) => {
    setEditingConcept(concept);
    setNewConcept({
      conceptId: concept.conceptId,
      title: concept.title,
      description: concept.description || "",
      promptTemplate: concept.promptTemplate,
      systemPrompt: concept.systemPrompt || "",
      thumbnailUrl: concept.thumbnailUrl || "",
      categoryId: concept.categoryId || "",
      usePhotoMaker: concept.usePhotoMaker || false,
      referenceImageUrl: concept.referenceImageUrl || "",
      photoMakerPrompt: concept.photoMakerPrompt || "",
      photoMakerNegativePrompt: concept.photoMakerNegativePrompt || "",
      photoMakerStrength: concept.photoMakerStrength || "1.0"
    });
    setConceptDialogOpen(true);
  };

  // 컨셉 삭제 다이얼로그 표시
  const handleDeleteClick = (conceptId: string) => {
    setConceptToDelete(conceptId);
    setDeleteDialogOpen(true);
  };

  // 컨셉 삭제 확인
  const confirmDelete = () => {
    if (conceptToDelete) {
      deleteConceptMutation.mutate(conceptToDelete);
    }
  };

  // 컨셉 저장
  const handleSaveConcept = (e: React.FormEvent) => {
    e.preventDefault();
    saveConceptMutation.mutate(newConcept);
  };

  // 입력 폼 초기화
  const resetForm = () => {
    setNewConcept({
      conceptId: "",
      title: "",
      description: "",
      promptTemplate: "",
      systemPrompt: "",
      thumbnailUrl: "",
      categoryId: "",
      usePhotoMaker: false,
      referenceImageUrl: "",
      photoMakerPrompt: "",
      photoMakerNegativePrompt: "",
      photoMakerStrength: "1.0"
    });
    setEditingConcept(null);
    setThumbnailFile(null);
    setReferenceFile(null);
  };

  // 모달 닫기
  const handleCloseDialog = () => {
    setConceptDialogOpen(false);
    resetForm();
  };

  // 썸네일 이미지 파일 선택 시
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setThumbnailFile(e.target.files[0]);
    }
  };

  // 레퍼런스 이미지 파일 선택 시
  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setReferenceFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-medium">스타일 컨셉 관리</h3>
        <Dialog open={conceptDialogOpen} onOpenChange={setConceptDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              새 컨셉 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingConcept ? '컨셉 수정' : '새 컨셉 추가'}</DialogTitle>
              <DialogDescription>
                AI 이미지 변환 스타일 컨셉을 {editingConcept ? '수정' : '추가'}합니다.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveConcept} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="conceptId">컨셉 ID</Label>
                  <Input
                    id="conceptId"
                    placeholder="영문, 숫자, 언더스코어만 사용 (예: elegant_portrait)"
                    value={newConcept.conceptId}
                    onChange={(e) => setNewConcept({ ...newConcept, conceptId: e.target.value })}
                    disabled={!!editingConcept}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">제목</Label>
                  <Input
                    id="title"
                    placeholder="컨셉 제목"
                    value={newConcept.title}
                    onChange={(e) => setNewConcept({ ...newConcept, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  placeholder="컨셉에 대한 간단한 설명"
                  value={newConcept.description}
                  onChange={(e) => setNewConcept({ ...newConcept, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">카테고리</Label>
                <Select 
                  value={newConcept.categoryId} 
                  onValueChange={(value) => setNewConcept({ ...newConcept, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category: ConceptCategory) => (
                      <SelectItem key={category.categoryId} value={category.categoryId}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="w-full mb-2 bg-muted-foreground/5">
                  <TabsTrigger value="basic" className="flex-1 font-semibold">기본 정보</TabsTrigger>
                  <TabsTrigger value="photomaker" className="flex-1 font-semibold text-blue-600 dark:text-blue-400">
                    <span className="flex items-center justify-center">
                      <Image className="h-4 w-4 mr-1" />
                      PhotoMaker 모드
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="flex-1 font-semibold">고급 설정</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="promptTemplate">기본 프롬프트 템플릿</Label>
                    <Textarea
                      id="promptTemplate"
                      placeholder="A beautiful {{object}} in {{style}} style, high quality"
                      value={newConcept.promptTemplate}
                      onChange={(e) => setNewConcept({ ...newConcept, promptTemplate: e.target.value })}
                      rows={3}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      {"{object}"}, {"{style}"}, {"{mood}"} 등의 변수를 사용할 수 있습니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="thumbnail">썸네일 이미지</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="thumbnail"
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="flex-1"
                      />
                      {(newConcept.thumbnailUrl || thumbnailFile) && (
                        <div className="w-16 h-16 rounded overflow-hidden border">
                          <img 
                            src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : newConcept.thumbnailUrl} 
                            alt="썸네일 미리보기" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="photomaker" className="space-y-4">
                  <div className="flex items-center space-x-2 mt-4">
                    <Switch
                      id="usePhotoMaker"
                      checked={newConcept.usePhotoMaker}
                      onCheckedChange={(checked) => setNewConcept({ ...newConcept, usePhotoMaker: checked })}
                    />
                    <Label htmlFor="usePhotoMaker">PhotoMaker 모드 사용</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    PhotoMaker 모드는 사용자의 얼굴 이미지를 레퍼런스 이미지에 합성할 수 있는 기능입니다.
                    활성화하면 OpenAI 대신 Replicate의 PhotoMaker 모델을 사용합니다.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="referenceImage">레퍼런스 이미지</Label>
                    <p className="text-sm text-muted-foreground">
                      사용자의 얼굴이 합성될 샘플 이미지를 업로드합니다. 얼굴이 명확히 보이는 이미지를 사용하세요.
                    </p>
                    <div className="flex items-center gap-4">
                      <Input
                        id="referenceImage"
                        type="file"
                        accept="image/*"
                        onChange={handleReferenceImageChange}
                        className="flex-1"
                        disabled={!newConcept.usePhotoMaker}
                      />
                      {(newConcept.referenceImageUrl || referenceFile) && (
                        <div className="w-24 h-24 rounded overflow-hidden border">
                          <img 
                            src={referenceFile ? URL.createObjectURL(referenceFile) : newConcept.referenceImageUrl} 
                            alt="레퍼런스 이미지 미리보기" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4 border-t pt-4">
                    <h4 className="font-semibold">PhotoMaker 고급 설정</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="photoMakerPrompt">커스텀 프롬프트 (선택사항)</Label>
                      <Textarea
                        id="photoMakerPrompt"
                        placeholder="A beautiful high-quality portrait, preserving facial features, detailed, artistic"
                        value={newConcept.photoMakerPrompt}
                        onChange={(e) => setNewConcept({ ...newConcept, photoMakerPrompt: e.target.value })}
                        rows={3}
                        disabled={!newConcept.usePhotoMaker}
                      />
                      <p className="text-sm text-muted-foreground">
                        PhotoMaker 모델에 전달할 커스텀 프롬프트입니다. 비워두면 기본값이 사용됩니다.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="photoMakerNegativePrompt">네거티브 프롬프트 (선택사항)</Label>
                      <Textarea
                        id="photoMakerNegativePrompt"
                        placeholder="ugly, blurry, bad anatomy, bad hands, text, error, missing fingers, extra digit, cropped"
                        value={newConcept.photoMakerNegativePrompt}
                        onChange={(e) => setNewConcept({ ...newConcept, photoMakerNegativePrompt: e.target.value })}
                        rows={2}
                        disabled={!newConcept.usePhotoMaker}
                      />
                      <p className="text-sm text-muted-foreground">
                        이미지에 포함하지 않을 요소를 지정합니다. 비워두면 기본값이 사용됩니다.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="photoMakerStrength">적용 강도</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="photoMakerStrength"
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={newConcept.photoMakerStrength}
                          onChange={(e) => setNewConcept({ ...newConcept, photoMakerStrength: e.target.value })}
                          className="flex-1"
                          disabled={!newConcept.usePhotoMaker}
                        />
                        <span className="w-16 text-center">{newConcept.photoMakerStrength}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        스타일 적용 강도를 설정합니다. 값이
                        높을수록 더 많은 스타일이 적용됩니다. (기본값: 1.0)
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="advanced" className="space-y-4">
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="systemPrompt">시스템 프롬프트 (선택사항)</Label>
                    <Textarea
                      id="systemPrompt"
                      placeholder="이미지 분석과 변환을 위한 시스템 지침을 입력하세요."
                      value={newConcept.systemPrompt}
                      onChange={(e) => setNewConcept({ ...newConcept, systemPrompt: e.target.value })}
                      rows={6}
                    />
                    <p className="text-sm text-muted-foreground">
                      시스템 프롬프트는 AI 모델에게 이미지 처리 방법에 대한 상세한 지침을 제공합니다.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  취소
                </Button>
                <Button type="submit" disabled={isUploading || saveConceptMutation.isPending}>
                  {isUploading || saveConceptMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    '저장'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {isConceptsLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : concepts && concepts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {concepts.map((concept: Concept) => (
            <Card key={concept.conceptId} className="overflow-hidden">
              <CardHeader className={`p-4 pb-2 ${concept.usePhotoMaker ? 'border-l-4 border-blue-500' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      {concept.title}
                      {concept.usePhotoMaker && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          <Image className="h-3 w-3 mr-1" />
                          PhotoMaker
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{concept.conceptId}</CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEditConcept(concept)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteClick(concept.conceptId)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {concept.thumbnailUrl ? (
                  <div className="aspect-video w-full mb-2 bg-muted rounded-md overflow-hidden">
                    <img 
                      src={concept.thumbnailUrl} 
                      alt={concept.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full mb-2 bg-muted rounded-md flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                
                <div className="space-y-2">
                  {concept.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{concept.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {concept.categoryId && (
                      <span className="text-xs bg-secondary px-2 py-1 rounded">
                        {categories.find((c: ConceptCategory) => c.categoryId === concept.categoryId)?.name || concept.categoryId}
                      </span>
                    )}
                    {concept.referenceImageUrl && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded flex items-center">
                        <Image className="h-3 w-3 mr-1" />
                        레퍼런스 이미지
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">컨셉이 없습니다. 새 컨셉을 추가해 보세요.</p>
          <Button className="mt-4" variant="outline" onClick={() => setConceptDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            새 컨셉 추가
          </Button>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>컨셉 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 컨셉을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {deleteConceptMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '삭제'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}