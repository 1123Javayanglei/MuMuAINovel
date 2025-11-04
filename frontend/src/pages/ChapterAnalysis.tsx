import React, { useState, useEffect } from 'react';
import { Card, List, Button, Space, Empty, Tag, Spin, Alert, Switch, Drawer, message, Progress } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  MenuOutlined,
  ReloadOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import AnnotatedText, { type MemoryAnnotation } from '../components/AnnotatedText';
import MemorySidebar from '../components/MemorySidebar';

interface ChapterItem {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  status: string;
}

interface AnnotationsData {
  chapter_id: string;
  chapter_number: number;
  title: string;
  word_count: number;
  annotations: MemoryAnnotation[];
  has_analysis: boolean;
  summary: {
    total_annotations: number;
    hooks: number;
    foreshadows: number;
    plot_points: number;
    character_events: number;
  };
}

interface NavigationData {
  current: {
    id: string;
    chapter_number: number;
    title: string;
  };
  previous: {
    id: string;
    chapter_number: number;
    title: string;
  } | null;
  next: {
    id: string;
    chapter_number: number;
    title: string;
  } | null;
}

/**
 * 项目内的章节剧情分析页面
 * 显示章节列表和带标注的章节内容
 */
const ChapterAnalysis: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<ChapterItem | null>(null);
  const [annotationsData, setAnnotationsData] = useState<AnnotationsData | null>(null);
  const [navigation, setNavigation] = useState<NavigationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | undefined>();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [scrollToContentAnnotation, setScrollToContentAnnotation] = useState<string | undefined>();
  const [scrollToSidebarAnnotation, setScrollToSidebarAnnotation] = useState<string | undefined>();

  // 加载章节列表
  useEffect(() => {
    const loadChapters = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/chapters/project/${projectId}`);
        // API 拦截器已经解析了 response.data，所以直接使用
        const data = response.data || response;
        const chapterList = data.items || [];
        setChapters(chapterList);
        
        // 自动选择第一个有内容的章节
        const firstChapterWithContent = chapterList.find((ch: ChapterItem) => ch.content && ch.content.trim() !== '');
        if (firstChapterWithContent) {
          loadChapterContent(firstChapterWithContent.id);
        }
      } catch (error) {
        console.error('加载章节列表失败:', error);
        message.error('加载章节列表失败');
      } finally {
        setLoading(false);
      }
    };

    loadChapters();
  }, [projectId]);

  // 加载章节内容和标注
  const loadChapterContent = async (chapterId: string) => {
    try {
      setContentLoading(true);
      
      const [chapterResponse, annotationsResponse, navigationResponse] = await Promise.all([
        api.get(`/chapters/${chapterId}`),
        api.get(`/chapters/${chapterId}/annotations`).catch(() => null),
        api.get(`/chapters/${chapterId}/navigation`).catch(() => null),
      ]);

      // 提取 data 属性
      setSelectedChapter(chapterResponse.data || chapterResponse);
      setAnnotationsData(annotationsResponse ? (annotationsResponse.data || annotationsResponse) : null);
      setNavigation(navigationResponse ? (navigationResponse.data || navigationResponse) : null);
    } catch (error) {
      console.error('加载章节内容失败:', error);
      message.error('加载章节内容失败');
    } finally {
      setContentLoading(false);
    }
  };

  const handleChapterSelect = (chapterId: string) => {
    loadChapterContent(chapterId);
  };

  const handlePreviousChapter = () => {
    if (navigation?.previous) {
      loadChapterContent(navigation.previous.id);
    }
  };

  const handleNextChapter = () => {
    if (navigation?.next) {
      loadChapterContent(navigation.next.id);
    }
  };

  const handleAnnotationClick = (annotation: MemoryAnnotation, source: 'content' | 'sidebar' = 'content') => {
    setActiveAnnotationId(annotation.id);
    
    if (source === 'content') {
      // 从内容区点击，滚动到侧边栏
      setScrollToSidebarAnnotation(annotation.id);
      // 清除滚动状态
      setTimeout(() => setScrollToSidebarAnnotation(undefined), 100);
      
      if (window.innerWidth < 768) {
        setSidebarVisible(true);
      }
    } else {
      // 从侧边栏点击，滚动到内容区
      setScrollToContentAnnotation(annotation.id);
      // 清除滚动状态
      setTimeout(() => setScrollToContentAnnotation(undefined), 100);
    }
  };

  const handleReanalyze = async () => {
    if (!selectedChapter) return;

    let pollInterval: number | null = null;
    let timeoutId: number | null = null;

    try {
      setAnalyzing(true);
      setAnalysisProgress(0);
      message.loading({ content: '开始分析章节...', key: 'analyze', duration: 0 });

      // 触发分析任务
      const triggerRes = await api.post(`/chapters/${selectedChapter.id}/analyze`);
      const triggerData = triggerRes.data || triggerRes;
      const taskId = triggerData.task_id;
      
      console.log('分析任务已创建:', taskId);

      // 开始轮询状态
      let pollCount = 0;
      const maxPolls = 60; // 最多轮询60次（2分钟）
      
      pollInterval = setInterval(async () => {
        pollCount++;
        
        if (pollCount > maxPolls) {
          if (pollInterval) clearInterval(pollInterval);
          if (timeoutId) clearTimeout(timeoutId);
          setAnalyzing(false);
          message.warning({ content: '分析超时，请稍后刷新页面查看结果', key: 'analyze' });
          return;
        }

        try {
          const statusRes = await api.get(`/chapters/${selectedChapter.id}/analysis/status`);
          const responseData = statusRes.data || statusRes;
          
          if (!responseData) {
            console.warn(`第${pollCount}次轮询：响应数据为空`);
            return;
          }
          
          const { status, progress, error_message } = responseData;
          console.log(`第${pollCount}次轮询：status=${status}, progress=${progress}`);

          setAnalysisProgress(progress || 0);

          if (status === 'completed') {
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutId) clearTimeout(timeoutId);
            setAnalyzing(false);
            message.success({ content: '分析完成！', key: 'analyze' });
            
            // 重新加载标注数据
            try {
              const annotationsRes = await api.get(`/chapters/${selectedChapter.id}/annotations`);
              setAnnotationsData(annotationsRes.data || annotationsRes);
            } catch (annotErr) {
              console.error('加载标注数据失败:', annotErr);
              message.warning('分析完成，但加载标注数据失败，请刷新页面');
            }
          } else if (status === 'failed') {
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutId) clearTimeout(timeoutId);
            setAnalyzing(false);
            message.error({
              content: `分析失败：${error_message || '未知错误'}`,
              key: 'analyze'
            });
          }
          // pending 或 running 状态继续轮询
        } catch (pollErr) {
          console.error(`第${pollCount}次轮询失败:`, pollErr);
          // 轮询错误不中断，继续下一次轮询
        }
      }, 2000);

      // 设置总超时（2分钟）
      timeoutId = setTimeout(() => {
        if (pollInterval) clearInterval(pollInterval);
        setAnalyzing(false);
        message.warning({ content: '分析超时，请稍后刷新页面查看结果', key: 'analyze' });
      }, 120000);

    } catch (err: any) {
      // 清理定时器
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
      
      setAnalyzing(false);
      const errorMsg = err.response?.data?.detail || err.message || '触发分析失败';
      console.error('触发分析失败:', errorMsg, err);
      message.error({
        content: errorMsg,
        key: 'analyze'
      });
    }
  };

  const hasAnnotations = annotationsData && annotationsData.annotations.length > 0;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载章节中..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 16 }}>
      {/* 左侧章节列表 */}
      <Card
        title="章节列表"
        style={{ width: 280, height: '100%', overflow: 'hidden' }}
        bodyStyle={{ padding: 0, height: 'calc(100% - 57px)', overflow: 'auto' }}
      >
        {chapters.length === 0 ? (
          <Empty description="暂无章节" style={{ marginTop: 60 }} />
        ) : (
          <List
            dataSource={chapters}
            renderItem={(chapter) => (
              <List.Item
                key={chapter.id}
                onClick={() => handleChapterSelect(chapter.id)}
                style={{
                  cursor: 'pointer',
                  padding: '12px 16px',
                  background: selectedChapter?.id === chapter.id ? '#e6f7ff' : 'transparent',
                  borderLeft: selectedChapter?.id === chapter.id ? '3px solid #1890ff' : '3px solid transparent',
                }}
              >
                <List.Item.Meta
                  title={
                    <span style={{ fontSize: 14, fontWeight: selectedChapter?.id === chapter.id ? 600 : 400 }}>
                      第{chapter.chapter_number}章: {chapter.title}
                    </span>
                  }
                  description={
                    <Space size={4}>
                      <Tag color={chapter.content && chapter.content.trim() !== '' ? 'success' : 'default'}>
                        {chapter.word_count || 0}字
                      </Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 右侧内容区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {!selectedChapter ? (
          <Card style={{ height: '100%' }}>
            <Empty description="请从左侧选择一个章节查看" style={{ marginTop: 100 }} />
          </Card>
        ) : (
          <>
            {/* 工具栏 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Button
                    icon={<LeftOutlined />}
                    onClick={handlePreviousChapter}
                    disabled={!navigation?.previous}
                    title={navigation?.previous ? `上一章: ${navigation.previous.title}` : '已是第一章'}
                  >
                    上一章
                  </Button>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    第{selectedChapter.chapter_number}章: {selectedChapter.title}
                  </span>
                  <Button
                    icon={<RightOutlined />}
                    onClick={handleNextChapter}
                    disabled={!navigation?.next}
                    title={navigation?.next ? `下一章: ${navigation.next.title}` : '已是最后一章'}
                  >
                    下一章
                  </Button>
                </Space>

                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleReanalyze}
                    loading={analyzing}
                    disabled={analyzing || !selectedChapter?.content || selectedChapter.content.trim() === ''}
                    title={!selectedChapter?.content || selectedChapter.content.trim() === '' ? '章节内容为空，无法分析' : ''}
                  >
                    {analyzing ? '分析中...' : '重新分析'}
                  </Button>
                  {hasAnnotations && (
                    <>
                      <Switch
                        checked={showAnnotations}
                        onChange={setShowAnnotations}
                        checkedChildren={<EyeOutlined />}
                        unCheckedChildren={<EyeInvisibleOutlined />}
                      />
                      <span style={{ fontSize: 13, color: '#666' }}>显示标注</span>
                      <Button
                        icon={<MenuOutlined />}
                        onClick={() => setSidebarVisible(true)}
                        style={{ display: window.innerWidth < 768 ? 'inline-block' : 'none' }}
                      >
                        分析
                      </Button>
                    </>
                  )}
                </Space>
              </div>

              {analyzing && (
                <div style={{ marginTop: 12 }}>
                  <Progress percent={analysisProgress} size="small" status="active" />
                  <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                    正在分析章节...
                  </span>
                </div>
              )}

              {!analyzing && hasAnnotations && annotationsData && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                  共有 {annotationsData.summary.total_annotations} 个标注：
                  {annotationsData.summary.hooks > 0 && ` 🎣${annotationsData.summary.hooks}个钩子`}
                  {annotationsData.summary.foreshadows > 0 &&
                    ` 🌟${annotationsData.summary.foreshadows}个伏笔`}
                  {annotationsData.summary.plot_points > 0 &&
                    ` 💎${annotationsData.summary.plot_points}个情节点`}
                  {annotationsData.summary.character_events > 0 &&
                    ` 👤${annotationsData.summary.character_events}个角色事件`}
                </div>
              )}
            </Card>

            {/* 内容区域 */}
            <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden' }}>
              {/* 章节内容 */}
              <Card
                style={{ flex: 1, overflow: 'auto' }}
                loading={contentLoading}
              >
                {!contentLoading && (
                  <>
                    {!hasAnnotations && (
                      <Alert
                        message="暂无分析数据"
                        description="该章节尚未进行AI分析，无法显示记忆标注。"
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                      />
                    )}

                    {showAnnotations && hasAnnotations && annotationsData ? (
                      <AnnotatedText
                        content={selectedChapter.content}
                        annotations={annotationsData.annotations}
                        onAnnotationClick={(annotation) => handleAnnotationClick(annotation, 'content')}
                        activeAnnotationId={activeAnnotationId}
                        scrollToAnnotation={scrollToContentAnnotation}
                      />
                    ) : (
                      <div
                        style={{
                          lineHeight: 2,
                          fontSize: 16,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {selectedChapter.content}
                      </div>
                    )}
                  </>
                )}
              </Card>

              {/* 右侧记忆侧边栏（桌面端） */}
              {hasAnnotations && annotationsData && window.innerWidth >= 768 && (
                <Card
                  style={{ width: 400, overflow: 'auto' }}
                  bodyStyle={{ padding: 0 }}
                >
                  <MemorySidebar
                    annotations={annotationsData.annotations}
                    activeAnnotationId={activeAnnotationId}
                    onAnnotationClick={(annotation) => handleAnnotationClick(annotation, 'sidebar')}
                    scrollToAnnotation={scrollToSidebarAnnotation}
                  />
                </Card>
              )}
            </div>

            {/* 移动端抽屉 */}
            {hasAnnotations && annotationsData && (
              <Drawer
                title="章节分析"
                placement="right"
                onClose={() => setSidebarVisible(false)}
                open={sidebarVisible}
                width="80%"
              >
                <MemorySidebar
                  annotations={annotationsData.annotations}
                  activeAnnotationId={activeAnnotationId}
                  onAnnotationClick={(annotation) => {
                    handleAnnotationClick(annotation, 'sidebar');
                    setSidebarVisible(false);
                  }}
                  scrollToAnnotation={scrollToSidebarAnnotation}
                />
              </Drawer>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChapterAnalysis;