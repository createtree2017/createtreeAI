import { db } from './db';
import { imageStyles } from '@shared/schema';
import { DREAM_BOOK_STYLES } from '@shared/dream-book';

// 태몽동화 스타일 목록을 데이터베이스에 추가하는 시드 스크립트
async function seedImageStyles() {
  try {
    console.log('이미지 스타일 시드 데이터 추가 시작...');

    // 기존 스타일 목록 조회
    const existingStyles = await db.query.imageStyles.findMany();
    console.log(`기존 스타일 수: ${existingStyles.length}`);

    // 하드코딩된 스타일 목록을 기반으로 DB 데이터 생성
    const now = new Date();
    const stylesPrompts: { [key: string]: string } = {
      ghibli: `You are an AI illustrator for Studio Ghibli-style children's storybooks.
All illustrations must reflect the warm, fantastical, emotionally-rich Studio Ghibli style.
Use soft pastel color palettes, gentle lighting, and delicate details in background elements.
Characters should have warm eyes and expressive faces that convey genuine emotions.
Nature elements should feel alive and magical with special attention to clouds, water, plants.
Create scenes with a sense of wonder and childlike imagination.
Each image should maintain consistent Ghibli aesthetics across the series.`,
      
      disney: `You are an AI illustrator for Disney-style children's storybooks.
All illustrations must reflect a magical, colorful, emotionally expressive Disney animation style.
Use vibrant color palettes, smooth shading, large expressive eyes, and warm lighting.
Characters should feel lively and charming, like classic Disney or Pixar films.
Each image should appear as if it's part of the same animated story.
Focus on clear emotions, cinematic composition, and whimsical fantasy elements.
Maintain consistent visual identity across all images.`,
      
      watercolor: `You are an AI illustrator for watercolor-style children's storybooks.
All illustrations must have an authentic watercolor painting aesthetic.
Use soft, blended color transitions, delicate line work, and subtle texture resembling watercolor on paper.
Create images with gentle, dreamy quality with slightly uneven coloring typical of watercolor.
Allow white space and transparency to create lightness and airiness in the composition.
Employ soft shadows and highlights that blend gently into surrounding areas.
Maintain a consistent hand-painted watercolor style across all images.`,
      
      realistic: `You are an AI illustrator for realistic-style children's storybooks.
Create lifelike illustrations with accurate proportions, detailed textures, and natural lighting.
Use sophisticated color blending with subtle highlights and shadows for dimensional depth.
Render characters with naturalistic features, proportions, and expressions.
Incorporate realistic environmental details like accurate plants, materials, and atmospheric effects.
Employ proper perspective and spatial relationships between all elements.
Maintain photorealistic consistency in style, lighting, and detail level across all images.`,
      
      korean: `You are an AI illustrator for Korean traditional painting style children's storybooks.
Create illustrations reminiscent of traditional Korean 'Minhwa' folk paintings or ink-wash paintings.
Use delicate brushwork with varied line weights and occasional deliberately visible brush strokes.
Combine vibrant colors (for Minhwa style) or monochromatic ink washes with occasional color accents.
Incorporate elements of Korean iconography, cultural symbols, and natural scenery when appropriate.
Arrange compositions with balanced empty space following East Asian aesthetic principles.
Maintain consistent traditional Korean visual aesthetics across all images.`
    };

    for (const style of DREAM_BOOK_STYLES) {
      const id = style.id;
      const name = style.name;
      const description = style.description;
      const systemPrompt = stylesPrompts[id] || '';

      // 이미 존재하는 스타일인지 확인
      const existingStyle = existingStyles.find(s => 
        s.name.toLowerCase() === name.toLowerCase() || 
        (s.description && s.description.toLowerCase() === description.toLowerCase())
      );

      if (!existingStyle) {
        // 새 스타일 추가
        const [newStyle] = await db.insert(imageStyles).values({
          name,
          description,
          systemPrompt,
          isActive: true,
          creatorId: 10, // 관리자 ID (필요에 따라 수정)
          order: 0,
          createdAt: now,
          updatedAt: now
        }).returning();

        console.log(`새 스타일 추가: [${id}] ${name}`);
      } else {
        console.log(`이미 존재하는 스타일: [${id}] ${name}`);
      }
    }

    console.log('이미지 스타일 시드 데이터 추가 완료!');
  } catch (error) {
    console.error('이미지 스타일 시드 데이터 추가 오류:', error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
seedImageStyles();