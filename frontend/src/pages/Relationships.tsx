import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Table, Tag, Button, Space, message, Modal, Form, Select, Slider, Input, Tabs, AutoComplete, Descriptions, Divider } from 'antd';
import { PlusOutlined, ApartmentOutlined, UserOutlined, EditOutlined } from '@ant-design/icons';
import { useStore } from '../store';
import axios from 'axios';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const { TextArea } = Input;

interface Relationship {
  id: string;
  character_from_id: string;
  character_to_id: string;
  relationship_name: string;
  intimacy_level: number;
  status: string;
  description?: string;
  source: string;
}

interface RelationshipType {
  id: number;
  name: string;
  category: string;
  reverse_name?: string;
  icon?: string;
}

interface Character {
  id: string;
  name: string;
  is_organization: boolean;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  role_type: string;
  avatar: string | null;
}

interface GraphLink {
  source: string;
  target: string;
  relationship: string;
  intimacy: number;
  status: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface CharacterDetail {
  project_id: string;
  name: string;
  age: string;
  gender: string;
  is_organization: boolean;
  role_type: string;
  personality: string;
  background: string;
  appearance: string;
  organization_type: string;
  organization_purpose: string;
  organization_members: string;
  traits: string;
  avatar_url: string;
  power_level: number;
  location: string;
  motto: string;
  color: string;
}

export default function Relationships() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useStore();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null);
  const [form] = Form.useForm();
  const [modal, contextHolder] = Modal.useModal();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeDetail, setNodeDetail] = useState<CharacterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [relsRes, typesRes, charsRes] = await Promise.all([
        axios.get(`/api/relationships/project/${projectId}`),
        axios.get('/api/relationships/types'),
        axios.get(`/api/characters?project_id=${projectId}`)
      ]);

      setRelationships(relsRes.data);
      setRelationshipTypes(typesRes.data);
      setCharacters(charsRes.data.items || []);
    } catch (error) {
      message.error('加载数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadGraphData = async () => {
    if (!projectId) return;
    setGraphLoading(true);
    try {
      const res = await axios.get(`/api/relationships/graph/${projectId}`);
      const data = res.data as GraphData;

      // 转换为 React Flow 的节点和边
      const getNodeColors = (type: string, roleType: string) => {
        // 人物颜色
        if (type === 'character') {
          if (roleType === 'protagonist') return { border: '#f5222d', bg: '#f5222d' };
          if (roleType === 'antagonist') return { border: '#cf1322', bg: '#cf1322' };
          return { border: '#1890ff', bg: '#1890ff' };
        }
        // 组织颜色
        return { border: '#52c41a', bg: '#52c41a' };
      };

      const flowNodes: Node[] = data.nodes.map((node, index) => {
        const colors = getNodeColors(node.type, node.role_type);
        return {
          id: node.id,
          type: 'default',
          position: {
            x: 100 + (index % 4) * 200,
            y: 100 + Math.floor(index / 4) * 150,
          },
          data: {
            label: node.name,
            type: node.type,
            role_type: node.role_type,
          },
          style: {
            border: `2px solid ${colors.border}`,
            borderRadius: 8,
            backgroundColor: `${colors.bg}33`, // 20% 透明度
            padding: '10px 15px',
            minWidth: 100,
          },
        };
      });

      const flowEdges: Edge[] = data.links.map(link => ({
        id: `${link.source}-${link.target}`,
        source: link.source,
        target: link.target,
        label: link.relationship,
        type: 'smoothstep',
        style: {
          stroke: link.status === 'active' ? '#a3b1bf' : '#ffccc7',
          strokeWidth: 2,
        },
        labelStyle: {
          fill: '#666',
          fontSize: 10,
        },
        labelBgStyle: {
          fill: '#fff',
          fillOpacity: 0.9,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: link.status === 'active' ? '#a3b1bf' : '#ffccc7',
        },
        data: {
          intimacy: link.intimacy,
          status: link.status,
        },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
      setGraphData(data);
    } catch (error) {
      message.error('加载关系图谱失败');
      console.error(error);
    } finally {
      setGraphLoading(false);
    }
  };

  const loadNodeDetail = async (nodeId: string) => {
    if (!projectId) return;
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/characters?project_id=${projectId}`);
      const characters = res.data.items || [];
      // 通过 id 查找角色
      const character = characters.find((c: { id: string }) => c.id === nodeId);
      if (character) {
        setNodeDetail(character);
      } else {
        // 如果没找到，尝试通过 name 查找
        const nodeLabel = nodes.find(n => n.id === nodeId)?.data.label;
        const characterByName = characters.find((c: { name: string }) => c.name === nodeLabel);
        if (characterByName) {
          setNodeDetail(characterByName);
        } else {
          message.error('未找到该角色详细信息');
        }
      }
    } catch (error) {
      message.error('加载角色详情失败');
      console.error(error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleNodeClick = (_: unknown, node: { id: string }) => {
    setSelectedNodeId(node.id);
    loadNodeDetail(node.id);
  };

  const handleCloseDetail = () => {
    setSelectedNodeId(null);
    setNodeDetail(null);
  };

  const handleCreateRelationship = async (values: {
    character_from_id: string;
    character_to_id: string;
    relationship_name: string;
    intimacy_level: number;
    status: string;
    description?: string;
  }) => {
    try {
      await axios.post('/api/relationships/', {
        project_id: projectId,
        ...values
      });
      message.success('关系创建成功');
      setIsModalOpen(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error('创建关系失败');
      console.error(error);
    }
  };

  const handleEditRelationship = (record: Relationship) => {
    setEditingRelationship(record);
    setIsEditMode(true);
    form.setFieldsValue({
      character_from_id: record.character_from_id,
      character_to_id: record.character_to_id,
      relationship_name: record.relationship_name,
      intimacy_level: record.intimacy_level,
      status: record.status,
      description: record.description,
    });
    setIsModalOpen(true);
  };

  const handleUpdateRelationship = async (values: {
    character_from_id: string;
    character_to_id: string;
    relationship_name: string;
    intimacy_level: number;
    status: string;
    description?: string;
  }) => {
    if (!editingRelationship) return;

    try {
      await axios.put(`/api/relationships/${editingRelationship.id}`, {
        relationship_name: values.relationship_name,
        intimacy_level: values.intimacy_level,
        status: values.status,
        description: values.description,
      });
      message.success('关系更新成功');
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingRelationship(null);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error('更新关系失败');
      console.error(error);
    }
  };

  const handleDeleteRelationship = async (id: string) => {
    modal.confirm({
      title: '确认删除',
      content: '确定要删除这条关系吗？',
      centered: true,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/relationships/${id}`);
          message.success('关系删除成功');
          loadData();
        } catch (error) {
          message.error('删除失败');
          console.error(error);
        }
      }
    });
  };

  const getCharacterName = (id: string) => {
    const char = characters.find(c => c.id === id);
    return char?.name || '未知';
  };

  const getIntimacyColor = (level: number) => {
    if (level >= 75) return 'green';
    if (level >= 50) return 'blue';
    if (level >= 25) return 'orange';
    if (level >= 0) return 'volcano';
    return 'red';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      broken: 'red',
      past: 'default',
      complicated: 'orange'
    };
    return colors[status] || 'default';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      family: 'magenta',
      social: 'blue',
      hostile: 'red',
      professional: 'cyan'
    };
    return colors[category] || 'default';
  };

  const columns = [
    {
      title: '角色A',
      dataIndex: 'character_from_id',
      key: 'from',
      render: (id: string) => (
        <Tag icon={<UserOutlined />} color="blue">
          {getCharacterName(id)}
        </Tag>
      ),
      width: 120,
    },
    {
      title: '关系',
      dataIndex: 'relationship_name',
      key: 'relationship',
      render: (name: string) => <strong>{name}</strong>,
      width: 120,
    },
    {
      title: '角色B',
      dataIndex: 'character_to_id',
      key: 'to',
      render: (id: string) => (
        <Tag icon={<UserOutlined />} color="purple">
          {getCharacterName(id)}
        </Tag>
      ),
      width: 120,
    },
    {
      title: '亲密度',
      dataIndex: 'intimacy_level',
      key: 'intimacy',
      render: (level: number) => (
        <Tag color={getIntimacyColor(level)}>{level}</Tag>
      ),
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
      width: 80,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <Tag>{source === 'ai' ? 'AI生成' : '手动创建'}</Tag>
      ),
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Relationship) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRelationship(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            size="small"
            onClick={() => handleDeleteRelationship(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
      width: 140,
      fixed: isMobile ? ('right' as const) : undefined,
    },
  ];

  // 按类别分组关系类型
  const groupedTypes = relationshipTypes.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, RelationshipType[]>);

  const categoryLabels: Record<string, string> = {
    family: '家族关系',
    social: '社交关系',
    professional: '职业关系',
    hostile: '敌对关系'
  };

  return (
    <>
      {contextHolder}
      <div>
        <Card
        title={
          <Space wrap>
            <ApartmentOutlined />
            <span style={{ fontSize: isMobile ? 14 : 16 }}>关系管理</span>
            {!isMobile && <Tag color="blue">{currentProject?.title}</Tag>}
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            size={isMobile ? 'small' : 'middle'}
          >
            {isMobile ? '添加' : '添加关系'}
          </Button>
        }
      >
        <Tabs
          items={[
            {
              key: 'list',
              label: `关系列表 (${relationships.length})`,
              children: (
                <Table
                  columns={columns}
                  dataSource={relationships}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    current: currentPage,
                    pageSize: isMobile ? 10 : pageSize,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    position: ['bottomCenter'],
                    showSizeChanger: !isMobile,
                    showQuickJumper: !isMobile,
                    showTotal: (total) => `共 ${total} 条`,
                    simple: isMobile,
                    onChange: (page, size) => {
                      setCurrentPage(page);
                      if (size !== pageSize) {
                        setPageSize(size);
                        setCurrentPage(1);
                      }
                    },
                    onShowSizeChange: (_, size) => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }
                  }}
                  scroll={{
                    x: 700,
                    y: isMobile ? 'calc(100vh - 360px)' : 'calc(100vh - 440px)'
                  }}
                  size={isMobile ? 'small' : 'middle'}
                />
              ),
            },
            {
              key: 'types',
              label: `关系类型 (${relationshipTypes.length})`,
              children: (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: isMobile ? '12px' : '16px',
                  maxHeight: isMobile ? 'calc(100vh - 400px)' : 'calc(100vh - 350px)',
                  overflow: 'auto'
                }}>
                  {Object.entries(groupedTypes).map(([category, types]) => (
                    <Card
                      key={category}
                      size="small"
                      title={categoryLabels[category] || category}
                      headStyle={{ backgroundColor: '#f5f5f5' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {types.map(type => (
                          <Tag key={type.id} color={getCategoryColor(category)}>
                            {type.icon} {type.name}
                            {type.reverse_name && ` ↔ ${type.reverse_name}`}
                          </Tag>
                        ))}
                      </Space>
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              key: 'graph',
              label: '关系图谱',
              children: (
                <div style={{ height: isMobile ? 'calc(100vh - 400px)' : 'calc(100vh - 350px)' }}>
                  {!graphData && !graphLoading && (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                      <Button type="primary" onClick={loadGraphData} loading={graphLoading}>
                        加载关系图谱
                      </Button>
                    </div>
                  )}
                  {graphLoading && (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                      加载中...
                    </div>
                  )}
                  {graphData && (
                    <>
                      <div style={{
                        marginBottom: 12,
                        display: 'flex',
                        gap: 16,
                        flexWrap: 'wrap',
                        alignItems: 'center'
                      }}>
                        <Tag color="blue">节点: {graphData.nodes.length}</Tag>
                        <Tag color="green">关系: {graphData.links.length}</Tag>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          提示: 拖拽画布平移 | 滚轮缩放 | 拖拽节点移动 | 点击节点查看详情
                        </div>
                      </div>
                      <div style={{
                        width: '100%',
                        height: isMobile ? 'calc(100% - 60px)' : 'calc(100% - 60px)',
                        minHeight: 400,
                        border: '1px solid #e8e8e8',
                        borderRadius: 4,
                        backgroundColor: '#fafafa'
                      }}>
                        <ReactFlow
                          nodes={nodes}
                          edges={edges}
                          onNodesChange={onNodesChange}
                          onEdgesChange={onEdgesChange}
                          onNodeClick={handleNodeClick}
                          fitView
                          fitViewOptions={{ padding: 0.2 }}
                          attributionPosition="bottom-left"
                        >
                          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                          <Controls />
                          <MiniMap
                            nodeColor={(node) => {
                              const data = node.data as { type?: string; role_type?: string };
                              if (data?.type === 'organization') return '#52c41a';
                              if (data?.role_type === 'protagonist') return '#f5222d';
                              return '#1890ff';
                            }}
                            style={{ backgroundColor: '#f5f5f5' }}
                          />
                        </ReactFlow>
                      </div>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={isEditMode ? '编辑关系' : '添加关系'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setIsEditMode(false);
          setEditingRelationship(null);
          form.resetFields();
        }}
        footer={null}
        centered={!isMobile}
        width={isMobile ? '100%' : 600}
        style={isMobile ? { top: 0, paddingBottom: 0, maxWidth: '100vw' } : undefined}
        styles={isMobile ? { body: { maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' } } : undefined}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={isEditMode ? handleUpdateRelationship : handleCreateRelationship}
        >
          <Form.Item
            name="character_from_id"
            label="角色A"
            rules={[{ required: true, message: '请选择角色A' }]}
          >
            <Select
              placeholder="选择角色"
              showSearch
              disabled={isEditMode}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={characters
                .filter(c => !c.is_organization)
                .map(c => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>

          <Form.Item
            name="relationship_name"
            label="关系类型"
            rules={[{ required: true, message: '请选择或输入关系类型' }]}
          >
            <AutoComplete
              placeholder="选择预定义类型或输入自定义关系"
              options={relationshipTypes.map(t => ({
                label: `${t.icon || ''} ${t.name} (${categoryLabels[t.category]})`,
                value: t.name
              }))}
              filterOption={(inputValue, option) =>
                option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            />
          </Form.Item>

          <Form.Item
            name="character_to_id"
            label="角色B"
            rules={[{ required: true, message: '请选择角色B' }]}
          >
            <Select
              placeholder="选择角色"
              showSearch
              disabled={isEditMode}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={characters
                .filter(c => !c.is_organization)
                .map(c => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>

          <Form.Item
            name="intimacy_level"
            label="亲密度"
            initialValue={50}
          >
            <Slider
              min={-100}
              max={100}
              marks={{
                '-100': '-100',
                '-50': '-50',
                0: '0',
                50: '50',
                100: '100'
              }}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            initialValue="active"
          >
            <Select>
              <Select.Option value="active">活跃</Select.Option>
              <Select.Option value="broken">破裂</Select.Option>
              <Select.Option value="past">过去</Select.Option>
              <Select.Option value="complicated">复杂</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="关系描述">
            <TextArea rows={3} placeholder="描述这段关系的细节..." />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsModalOpen(false);
                setIsEditMode(false);
                setEditingRelationship(null);
                form.resetFields();
              }}>取消</Button>
              <Button type="primary" htmlType="submit">
                {isEditMode ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 节点详情 Modal */}
      <Modal
        title={nodeDetail?.is_organization ? '组织详情' : '角色详情'}
        open={!!selectedNodeId}
        onCancel={handleCloseDetail}
        footer={[
          <Button key="close" onClick={handleCloseDetail}>
            关闭
          </Button>
        ]}
        width={isMobile ? '100%' : 700}
        loading={detailLoading}
      >
        {nodeDetail && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {nodeDetail.avatar_url ? (
                <img
                  src={nodeDetail.avatar_url}
                  alt={nodeDetail.name}
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: nodeDetail.color || '#1890ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  fontSize: 32,
                  color: '#fff'
                }}>
                  {nodeDetail.is_organization ? '🏛️' : '👤'}
                </div>
              )}
              <h2 style={{ marginTop: 8, marginBottom: 4 }}>{nodeDetail.name}</h2>
              <Space>
                <Tag color={nodeDetail.is_organization ? 'green' : 'blue'}>
                  {nodeDetail.is_organization ? '组织' : '角色'}
                </Tag>
                <Tag color={
                  nodeDetail.role_type === 'protagonist' ? 'red' :
                  nodeDetail.role_type === 'antagonist' ? 'orange' : 'blue'
                }>
                  {nodeDetail.role_type === 'protagonist' ? '主角' :
                   nodeDetail.role_type === 'antagonist' ? '反派' : '配角'}
                </Tag>
                {nodeDetail.gender && <Tag>{nodeDetail.gender}</Tag>}
                {nodeDetail.age && <Tag>{nodeDetail.age}岁</Tag>}
              </Space>
            </div>

            <Divider />

            {!nodeDetail.is_organization ? (
              // 角色详情
              <>
                {nodeDetail.appearance && (
                  <Descriptions column={1} size="small" bordered labelStyle={{ minWidth: 100 }}>
                    <Descriptions.Item label="外貌特征">{nodeDetail.appearance}</Descriptions.Item>
                  </Descriptions>
                )}
                {nodeDetail.personality && (
                  <Descriptions column={1} size="small" bordered labelStyle={{ minWidth: 100 }} style={{ marginTop: 8 }}>
                    <Descriptions.Item label="性格特点">{nodeDetail.personality}</Descriptions.Item>
                  </Descriptions>
                )}
                {nodeDetail.background && (
                  <Descriptions column={1} size="small" bordered labelStyle={{ minWidth: 100 }} style={{ marginTop: 8 }}>
                    <Descriptions.Item label="背景故事">{nodeDetail.background}</Descriptions.Item>
                  </Descriptions>
                )}
                {nodeDetail.traits && (
                  <div style={{ marginTop: 8 }}>
                    <strong>特征标签：</strong>
                    <div style={{ marginTop: 4 }}>
                      {JSON.parse(nodeDetail.traits).map((trait: string, index: number) => (
                        <Tag key={index} color="blue">{trait}</Tag>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              // 组织详情
              <>
                {nodeDetail.organization_type && (
                  <Descriptions column={1} size="small" bordered labelStyle={{ minWidth: 100 }}>
                    <Descriptions.Item label="组织类型">{nodeDetail.organization_type}</Descriptions.Item>
                  </Descriptions>
                )}
                {nodeDetail.organization_purpose && (
                  <Descriptions column={1} size="small" bordered labelStyle={{ minWidth: 100 }} style={{ marginTop: 8 }}>
                    <Descriptions.Item label="组织目的">{nodeDetail.organization_purpose}</Descriptions.Item>
                  </Descriptions>
                )}
                {nodeDetail.location && (
                  <Descriptions column={1} size="small" bordered labelStyle={{ minWidth: 100 }} style={{ marginTop: 8 }}>
                    <Descriptions.Item label="所在地">{nodeDetail.location}</Descriptions.Item>
                  </Descriptions>
                )}
                {nodeDetail.motto && (
                  <Descriptions column={1} size="small" bordered labelStyle={{ minWidth: 100 }} style={{ marginTop: 8 }}>
                    <Descriptions.Item label="组织格言">{nodeDetail.motto}</Descriptions.Item>
                  </Descriptions>
                )}
                {nodeDetail.power_level !== undefined && (
                  <Descriptions column={1} size="small" bordered labelStyle={{ minWidth: 100 }} style={{ marginTop: 8 }}>
                    <Descriptions.Item label="势力等级">{nodeDetail.power_level}/100</Descriptions.Item>
                  </Descriptions>
                )}
                {nodeDetail.organization_members && (
                  <div style={{ marginTop: 8 }}>
                    <strong>组织成员：</strong>
                    <div style={{ marginTop: 4 }}>
                      {JSON.parse(nodeDetail.organization_members).map((member: string, index: number) => (
                        <Tag key={index} color="green">{member}</Tag>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Modal>
      </div>
    </>
  );
}
