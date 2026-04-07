import React, { useContext, useState } from 'react';
import { Table, Tag, Button, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { AuthContext } from '../context/AuthContext';

const TaskTable = ({ tasks, loading, onEdit, onDelete, onViewHistory }) => {
    const { user } = useContext(AuthContext);
    const [searchText, setSearchText] = useState('');

    const priorityColors = {
        Low: 'blue',
        Medium: 'orange',
        High: 'volcano',
        Critical: 'red',
    };

    const statusColors = {
        'Not Started': 'default',
        'In Progress': 'processing',
        Completed: 'success',
        'On Hold': 'warning',
    };

    const columns = [
        {
            title: 'S.No.',
            key: 'sno',
            render: (text, record, index) => index + 1,
            width: 70,
        },
        {
            title: 'Tasks',
            dataIndex: 'title',
            key: 'title',
            // Remove filteredValue to prevent overriding other column filters
            onFilter: (value, record) => record.title.toLowerCase().includes(value.toLowerCase()),
        },
        {
            title: 'Track',
            dataIndex: 'track',
            key: 'track',
            filters: Array.from(new Set(tasks.map(t => t.track))).filter(Boolean).map(track => ({ text: track, value: track })),
            onFilter: (value, record) => record.track === value,
        },
        {
            title: 'Created By',
            dataIndex: ['createdBy', 'name'],
            key: 'createdBy',
            filters: Array.from(new Set(tasks.map(t => t.createdBy?.name))).filter(Boolean).map(name => ({ text: name, value: name })),
            onFilter: (value, record) => record.createdBy?.name === value,
        },
        {
            title: 'Assigned To',
            dataIndex: ['assignee', 'name'],
            key: 'assignee',
            filters: Array.from(new Set(tasks.map(t => t.assignee?.name))).filter(Boolean).map(name => ({ text: name, value: name })),
            onFilter: (value, record) => record.assignee?.name === value,
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            filters: ['Low', 'Medium', 'High', 'Critical'].map(p => ({ text: p, value: p })),
            onFilter: (value, record) => record.priority === value,
            render: (priority) => (
                <Tag color={priorityColors[priority]}>{priority}</Tag>
            ),
        },
        {
            title: 'Start Date',
            dataIndex: 'startDate',
            key: 'startDate',
            sorter: (a, b) => dayjs(a.startDate).unix() - dayjs(b.startDate).unix(),
            render: (date) => dayjs(date).format('YYYY-MM-DD'),
        },
        {
            title: 'Due Date',
            dataIndex: 'tentativeEndDate',
            key: 'tentativeEndDate',
            sorter: (a, b) => dayjs(a.tentativeEndDate).unix() - dayjs(b.tentativeEndDate).unix(),
            render: (date) => dayjs(date).format('YYYY-MM-DD'),
        },
        {
            title: 'Completed Date',
            dataIndex: 'actualEndDate',
            key: 'actualEndDate',
            sorter: (a, b) => {
                const dateA = a.actualEndDate ? dayjs(a.actualEndDate).unix() : 0;
                const dateB = b.actualEndDate ? dayjs(b.actualEndDate).unix() : 0;
                return dateA - dateB;
            },
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            filters: ['Not Started', 'In Progress', 'Completed', 'On Hold'].map(s => ({ text: s, value: s })),
            onFilter: (value, record) => record.status === value,
            render: (status, record) => {
                const isDelayed = status !== 'Completed' && dayjs(record.tentativeEndDate).isBefore(dayjs(), 'day');
                return (
                    <Space size={4} direction="vertical">
                        <Tag color={statusColors[status]}>{status}</Tag>
                        {isDelayed && <Tag bordered={false} color="error">Delayed</Tag>}
                    </Space>
                );
            },
        },
        {
            title: 'Comments',
            dataIndex: 'comments',
            key: 'comments',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => {
                const canEdit = user?.role === 'ADMIN' || (user?.role === 'MEMBER' && record.assignee?.id === user?.id);
                const canDelete = user?.role === 'ADMIN';

                return (
                    <Space size="middle">
                        <Button
                            type="text"
                            icon={<HistoryOutlined />}
                            onClick={() => onViewHistory(record.id)}
                            title="View History"
                        />
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => onEdit(record)}
                            disabled={!canEdit}
                        />
                        {canDelete && (
                            <Popconfirm
                                title="Delete this task?"
                                onConfirm={() => onDelete(record.id)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        )}
                    </Space>
                );
            },
        },
    ];

    const getRowClassName = (record) => {
        if (record.status === 'Completed') {
            return 'row-completed';
        }
        const isDelayed = record.status !== 'Completed' && dayjs(record.tentativeEndDate).isBefore(dayjs(), 'day');
        if (isDelayed) {
            return 'row-delayed';
        }

        // Check if due in next 2 days
        const daysUntilDue = dayjs(record.tentativeEndDate).diff(dayjs(), 'day');
        if (daysUntilDue >= 0 && daysUntilDue <= 2) {
            return 'row-due-soon';
        }
        return '';
    };

    // Local filter for search text so it works together with Antd Table column filters
    const filteredTasks = tasks.filter(task =>
        task.title?.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <>
            <div style={{ marginBottom: 16 }}>
                <input
                    placeholder="Search by task name"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    style={{ width: 200, padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 2 }}
                />
            </div>
            <Table
                columns={columns}
                dataSource={filteredTasks}
                rowKey="id"
                loading={loading}
                rowClassName={getRowClassName}
                pagination={false}
            />
        </>
    );
};

export default TaskTable;
