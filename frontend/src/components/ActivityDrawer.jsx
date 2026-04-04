import React, { useState, useEffect } from 'react';
import { Drawer, Timeline, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import api from '../services/api';

const { Text } = Typography;

const ActivityDrawer = ({ visible, onCancel, taskId }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && taskId) {
            fetchActivities();
        }
    }, [visible, taskId]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/tasks/${taskId}/activity`);
            setActivities(response.data);
        } catch (error) {
            console.error('Failed to fetch activity logs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Drawer
            title="Task Activity History"
            placement="right"
            onClose={onCancel}
            open={visible}
            width={400}
        >
            {loading ? (
                <div style={{ textAlign: 'center', marginTop: 50 }}>
                    <Spin size="large" />
                </div>
            ) : activities.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999' }}>
                    <p>No activity recorded yet.</p>
                </div>
            ) : (
                <Timeline mode="left">
                    {activities.map(log => (
                        <Timeline.Item
                            key={log.id}
                            color={log.action === 'Created' ? 'green' : log.action === 'Status Update' ? 'blue' : 'gray'}
                        >
                            <p style={{ marginBottom: 4 }}>
                                <strong>{log.action}</strong>
                            </p>
                            <p style={{ marginBottom: 4 }}>
                                <Text type="secondary">{log.details}</Text>
                            </p>
                            <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>
                                By {log.user?.name || 'Unknown'} at {dayjs(log.createdAt).format('MMM DD, YYYY HH:mm')}
                            </p>
                        </Timeline.Item>
                    ))}
                </Timeline>
            )}
        </Drawer>
    );
};

export default ActivityDrawer;
