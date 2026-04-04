import React from 'react';
import { Row, Col, Card, Statistic, Typography } from 'antd';
import { CheckCircleOutlined, SyncOutlined, ExclamationCircleOutlined, ClockCircleOutlined, ProjectOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const StatsCards = ({ tasks }) => {
    const totalTasks = tasks.length;
    const notStarted = tasks.filter(t => t.status === 'Not Started').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const onHold = tasks.filter(t => t.status === 'On Hold').length;
    const delayed = tasks.filter(t => t.status !== 'Completed' && dayjs(t.tentativeEndDate).isBefore(dayjs(), 'day')).length;

    const startOfWeek = dayjs().startOf('week');
    const endOfWeek = dayjs().endOf('week');

    const dueThisWeek = tasks.filter(t => {
        return t.status !== 'Completed' && dayjs(t.tentativeEndDate).isBetween(startOfWeek, endOfWeek, null, '[]');
    }).length;

    return (
        <Row gutter={[16, 16]} style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap' }}>
            <Col style={{ flex: 1, minWidth: '140px' }}>
                <Card bordered={false} bodyStyle={{ padding: '16px', background: '#f0f5ff', borderTop: '3px solid #1890ff', borderRadius: '4px' }}>
                    <Statistic
                        title="Total Tasks"
                        value={totalTasks}
                        prefix={<ProjectOutlined style={{ color: '#1890ff' }} />}
                    />
                </Card>
            </Col>
            <Col style={{ flex: 1, minWidth: '140px' }}>
                <Card bordered={false} bodyStyle={{ padding: '16px', background: '#f6ffed', borderTop: '3px solid #b7eb8f', borderRadius: '4px' }}>
                    <Statistic
                        title="Not Started"
                        value={notStarted}
                        prefix={<SyncOutlined style={{ color: '#8c8c8c' }} />}
                    />
                </Card>
            </Col>
            <Col style={{ flex: 1, minWidth: '140px' }}>
                <Card bordered={false} bodyStyle={{ padding: '16px', background: '#fffbe6', borderTop: '3px solid #ffe58f', borderRadius: '4px' }}>
                    <Statistic
                        title="In Progress"
                        value={inProgress}
                        prefix={<SyncOutlined style={{ color: '#faad14' }} />}
                    />
                </Card>
            </Col>
            <Col style={{ flex: 1, minWidth: '140px' }}>
                <Card bordered={false} bodyStyle={{ padding: '16px', background: '#fff7e6', borderTop: '3px solid #ffd591', borderRadius: '4px' }}>
                    <Statistic
                        title="On Hold"
                        value={onHold}
                        prefix={<ExclamationCircleOutlined style={{ color: '#fa8c16' }} />}
                    />
                </Card>
            </Col>
            <Col style={{ flex: 1, minWidth: '140px' }}>
                <Card bordered={false} bodyStyle={{ padding: '16px', background: '#f6ffed', borderTop: '3px solid #52c41a', borderRadius: '4px' }}>
                    <Statistic
                        title="Completed"
                        value={completed}
                        prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    />
                </Card>
            </Col>
            <Col style={{ flex: 1, minWidth: '140px' }}>
                <Card bordered={false} bodyStyle={{ padding: '16px', background: '#fff1f0', borderTop: '3px solid #ffa39e', borderRadius: '4px' }}>
                    <Statistic
                        title="Delayed"
                        value={delayed}
                        prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                        valueStyle={{ color: delayed > 0 ? '#cf1322' : 'inherit' }}
                    />
                </Card>
            </Col>
            <Col style={{ flex: 1, minWidth: '140px' }}>
                <Card bordered={false} bodyStyle={{ padding: '16px', background: '#fff1f0', borderTop: '3px solid #ff7875', borderRadius: '4px' }}>
                    <Statistic
                        title="Due This Week"
                        value={dueThisWeek}
                        prefix={<ClockCircleOutlined style={{ color: '#d4380d' }} />}
                    />
                </Card>
            </Col>
        </Row>
    );
};

export default StatsCards;
