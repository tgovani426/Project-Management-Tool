import React, { useState, useEffect, useContext } from 'react';
import { Layout, Typography, Button, message, Space, Select } from 'antd';
import { LogoutOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import StatsCards from '../components/StatsCards';
import TaskTable from '../components/TaskTable';
import AddTaskModal from '../components/AddTaskModal';
import ReportModal from '../components/ReportModal';
import AddUserModal from '../components/AddUserModal';
import ActivityDrawer from '../components/ActivityDrawer';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState('All');

    const [modalVisible, setModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [addUserModalVisible, setAddUserModalVisible] = useState(false);
    const [activityDrawerVisible, setActivityDrawerVisible] = useState(false);
    const [activeTaskId, setActiveTaskId] = useState(null);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await api.get('/tasks');
            setTasks(response.data);
        } catch (error) {
            message.error('Failed to fetch tasks');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            if (user?.role === 'ADMIN') {
                // Optionally, users endpoint might be restricted to Admin
                // The prompt says "Assignee dropdown (fetch from API)"
                const response = await api.get('/users');
                setUsers(response.data);
            } else {
                // Even members need users to assign. If restricted, need backend change.
                // Assuming get Users is accessible via protect middleware.
                const response = await api.get('/users');
                setUsers(response.data);
            }
        } catch (error) {
            message.error('Failed to fetch users');
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchUsers();
    }, []);

    const handleEditTask = (task) => {
        setEditingTask(task);
        setModalVisible(true);
    };

    const handleDeleteTask = async (id) => {
        try {
            await api.delete(`/tasks/${id}`);
            message.success('Task deleted');
            fetchTasks();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to delete task');
        }
    };

    const handleViewActivity = (taskId) => {
        setActiveTaskId(taskId);
        setActivityDrawerVisible(true);
    };

    const handleSaveTask = async (values) => {
        try {
            if (editingTask) {
                await api.put(`/tasks/${editingTask.id}`, values);
                message.success('Task updated');
            } else {
                await api.post('/tasks', values);
                message.success('Task created');
            }
            setModalVisible(false);
            fetchTasks();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to save task');
        }
    };

    const handleGenerateReport = async (payload) => {
        setGeneratingReport(true);
        try {
            const queryParams = new URLSearchParams(payload).toString();
            const response = await api.get(`/reports?${queryParams}`, {
                responseType: 'blob' // Important for file download
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Generate filename based on payload
            let filename = 'Task_Report.pdf';
            if (payload.type === 'monthly') {
                const monthName = dayjs().month(payload.month - 1).format('MMMM');
                filename = `Task_Report_${monthName}_${payload.year}.pdf`;
            } else if (payload.type === 'range') {
                filename = `Task_Report_Range_${payload.startDate}_to_${payload.endDate}.pdf`;
            } else if (payload.type === 'all') {
                filename = `Task_Report_All_Data.pdf`;
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            // Clean up
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            setReportModalVisible(false);
            message.success('Report generated successfully!');
        } catch (error) {
            console.error(error);
            message.error('Failed to generate report');
        } finally {
            setGeneratingReport(false);
        }
    };

    const handleSaveUser = async (values) => {
        try {
            await api.post('/auth/register', values);
            message.success('User created successfully');
            setAddUserModalVisible(false);
            fetchUsers(); // Refresh the list of users for dropdowns
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to create user');
        }
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ flex: 1 }}>
                    <Title level={3} style={{ margin: 0 }}>Task Tracker</Title>
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    {user?.role === 'ADMIN' && (
                        <Space>
                            <Button type="dashed" onClick={() => setReportModalVisible(true)}>
                                Generate Report
                            </Button>
                            <Button type="dashed" onClick={() => setAddUserModalVisible(true)}>
                                Add User
                            </Button>
                        </Space>
                    )}
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Space>
                        <span>Welcome, {user?.name} ({user?.role})</span>
                        <Button icon={<LogoutOutlined />} onClick={logout}>Logout</Button>
                    </Space>
                </div>
            </Header>

            <Content style={{ padding: '24px', background: '#f5f5f5' }}>
                <StatsCards tasks={tasks} />

                <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', minHeight: '500px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Space size="large">
                            <Title level={4} style={{ margin: 0 }}>Task List</Title>
                            <Select
                                value={selectedTrack}
                                onChange={value => setSelectedTrack(value)}
                                style={{ width: 150 }}
                            >
                                <Option value="All">All Tracks</Option>
                                <Option value="Java MVC">Java MVC</Option>
                                <Option value="Java MS">Java MS</Option>
                                <Option value="Mobile Citizen">Mobile Citizen</Option>
                                <Option value="Mobile Official">Mobile Official</Option>
                                <Option value="React">React</Option>
                                <Option value="Angular">Angular</Option>
                                <Option value="AIML">AIML</Option>
                                <Option value="QA">QA</Option>
                                <Option value="DB">DB</Option>
                                <Option value="Infra">Infra</Option>
                                <Option value="BA">BA</Option>
                                <Option value="Analytics">Analytics</Option>
                            </Select>
                        </Space>
                        {user?.role === 'ADMIN' && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTask(null); setModalVisible(true); }}>
                                Add Task
                            </Button>
                        )}
                    </div>

                    <TaskTable
                        tasks={selectedTrack === 'All' ? tasks : tasks.filter(t => t.track === selectedTrack)}
                        loading={loading}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onViewHistory={handleViewActivity}
                    />
                </div>
            </Content>

            <AddTaskModal
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onSave={handleSaveTask}
                editingTask={editingTask}
                users={users}
            />

            <ReportModal
                visible={reportModalVisible}
                onCancel={() => setReportModalVisible(false)}
                onGenerate={handleGenerateReport}
                loading={generatingReport}
            />

            <AddUserModal
                visible={addUserModalVisible}
                onCancel={() => setAddUserModalVisible(false)}
                onSave={handleSaveUser}
            />

            <ActivityDrawer
                visible={activityDrawerVisible}
                onCancel={() => { setActivityDrawerVisible(false); setActiveTaskId(null); }}
                taskId={activeTaskId}
            />
        </Layout>
    );
};

export default Dashboard;
