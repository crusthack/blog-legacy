import type { Metadata } from 'next';

import UploadPreview from '@/components/UploadPreview';

export const metadata: Metadata = {
  title: 'MDX 업로드',
  description: '업로드한 MD/MDX 파일을 포스트뷰와 슬라이드뷰로 미리봅니다.',
};

export default function UploadPage() {
  return <UploadPreview />;
}
