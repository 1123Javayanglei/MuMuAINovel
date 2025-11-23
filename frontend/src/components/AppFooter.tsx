import { Typography, Space, Divider } from 'antd';
import { GithubOutlined, CopyrightOutlined, HeartFilled, ClockCircleOutlined } from '@ant-design/icons';
import { VERSION_INFO, getVersionString } from '../config/version';

const { Text, Link } = Typography;

export default function AppFooter() {
  const isMobile = window.innerWidth <= 768;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        padding: isMobile ? '8px 12px' : '10px 16px',
        zIndex: 100,
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.1), 0 -1px 4px rgba(0, 0, 0, 0.06)',
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        {isMobile ? (
          // 移动端：紧凑单行布局
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap'
          }}>
            <Text
              style={{
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#fff',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              }}
            >
              <strong style={{ color: '#fff' }}>{VERSION_INFO.projectName}</strong>
              <span>{getVersionString()}</span>
            </Text>
            <Divider type="vertical" style={{ margin: '0 4px', borderColor: 'rgba(255, 255, 255, 0.3)' }} />
            <Link
              href={VERSION_INFO.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#fff',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              }}
            >
              <GithubOutlined style={{ fontSize: 12 }} />
            </Link>
            <Text
              style={{
                fontSize: 10,
                color: 'rgba(255, 255, 255, 0.8)',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              }}
            >
              <ClockCircleOutlined style={{ fontSize: 10, marginRight: 4 }} />
              {VERSION_INFO.buildTime}
            </Text>
          </div>
        ) : (
          // PC端：完整布局
          <Space
            direction="horizontal"
            size={12}
            split={<Divider type="vertical" style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }} />}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {/* 版本信息 */}
            <Text
              style={{
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#fff',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              }}
            >
              <strong style={{ color: '#fff' }}>{VERSION_INFO.projectName}</strong>
              <span>{getVersionString()}</span>
            </Text>

            {/* GitHub 链接 */}
            <Link
              href={VERSION_INFO.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#fff',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              }}
            >
              <GithubOutlined style={{ fontSize: 13 }} />
              <span>GitHub</span>
            </Link>

            {/* LinuxDO 社区 */}
            <Link
              href={VERSION_INFO.linuxDoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: '#fff',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              }}
            >
              LinuxDO 社区
            </Link>

            {/* 许可证 */}
            <Link
              href={VERSION_INFO.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#fff',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              }}
            >
              <CopyrightOutlined style={{ fontSize: 11 }} />
              <span>{VERSION_INFO.license}</span>
            </Link>

            {/* 更新时间 */}
            <Text
              style={{
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: 'rgba(255, 255, 255, 0.9)',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              }}
            >
              <ClockCircleOutlined style={{ fontSize: 12 }} />
              <span>{VERSION_INFO.buildTime}</span>
            </Text>

            {/* 致谢信息 */}
            <Text
              style={{
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#fff',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              }}
            >
              <span>Made with</span>
              <HeartFilled style={{ color: '#ff4d4f', fontSize: 11 }} />
              <span>by {VERSION_INFO.author}</span>
            </Text>
          </Space>
        )}
      </div>
    </div>
  );
}