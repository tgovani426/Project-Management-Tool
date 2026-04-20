import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;

const ASSIGNED_BY_LIST = [
    "Rajesh Kumar",
    "Suresh Mehta",
    "Priya Sharma",
    "Anil Patel",
    "Kavita Verma",
    "Amit Singh",
    "Others"
];

const AddTaskModal = ({ visible, onCancel, onSave, editingTask, users }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible && editingTask) {
            let assignedBy = editingTask.assignedBy;
            let otherAssignedBy = undefined;

            if (assignedBy && !ASSIGNED_BY_LIST.includes(assignedBy)) {
                otherAssignedBy = assignedBy;
                assignedBy = "Others";
            }

            form.setFieldsValue({
                ...editingTask,
                assignedBy,
                otherAssignedBy,
                startDate: editingTask.startDate ? dayjs(editingTask.startDate) : null,
                tentativeEndDate: editingTask.tentativeEndDate ? dayjs(editingTask.tentativeEndDate) : null,
                assignee: editingTask.assignee?.id || editingTask.assignee,
            });
        } else if (visible && !editingTask) {
            form.resetFields();
        }
    }, [visible, editingTask, form]);

    const handleOk = () => {
        form.validateFields()
            .then(values => {
                const finalAssignedBy = values.assignedBy === 'Others' ? values.otherAssignedBy : values.assignedBy;
                const { otherAssignedBy, ...restValues } = values;

                onSave({
                    ...restValues,
                    assignedBy: finalAssignedBy,
                    startDate: restValues.startDate.toDate(),
                    tentativeEndDate: restValues.tentativeEndDate.toDate()
                });
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    };

    return (
        <Modal
            title={editingTask ? 'Edit Task' : 'Add Task'}
            open={visible}
            onOk={handleOk}
            onCancel={onCancel}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{ status: 'Not Started', priority: 'Medium' }}
            >
                <Form.Item
                    name="title"
                    label="Task Name"
                    rules={[{ required: true, message: 'Please input the task name!' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="track"
                    label="Track"
                    rules={[{ required: true, message: 'Please select a track!' }]}
                >
                    <Select>
                        <Option value="Java MVC">Java MVC</Option>
                        <Option value="Java MS">Java MS</Option>
                        <Option value="RajCop Mobile Citizen">RajCop Mobile Citizen</Option>
                        <Option value="RajCop Mobile Official">RajCop Mobile Official</Option>
                        <Option value="React/Angular">React/Angular</Option>
                        <Option value="AIML">AI/ML</Option>
                        <Option value="QA">QA</Option>
                        <Option value="DB">DB</Option>
                        <Option value="Infra">Infra</Option>
                        <Option value="Analytics">Analytics</Option>
                        <Option value="BA">BA</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Description"
                >
                    <Input.TextArea rows={2} />
                </Form.Item>

                <Form.Item
                    name="comments"
                    label="Comments"
                >
                    <Input.TextArea rows={2} />
                </Form.Item>

                <Form.Item
                    name="startDate"
                    label="Start Date"
                    rules={[{ required: true, message: 'Please select a start date!' }]}
                >
                    <DatePicker
                        style={{ width: '100%' }}
                        disabledDate={(current) => {
                            return current && current < dayjs().subtract(2, 'day').startOf('day');
                        }}
                    />
                </Form.Item>

                <Form.Item
                    name="tentativeEndDate"
                    label="Tentative End Date"
                    dependencies={['startDate']}
                    rules={[
                        { required: true, message: 'Please select a tentative end date!' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || !getFieldValue('startDate')) {
                                    return Promise.resolve();
                                }
                                if (value.isBefore(getFieldValue('startDate'), 'day')) {
                                    return Promise.reject(new Error('Tentative end date must be after or same as start date!'));
                                }
                                return Promise.resolve();
                            },
                        }),
                    ]}
                >
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    name="priority"
                    label="Priority"
                    rules={[{ required: true, message: 'Please select a priority!' }]}
                >
                    <Select>
                        <Option value="Low">Low</Option>
                        <Option value="Medium">Medium</Option>
                        <Option value="High">High</Option>
                        <Option value="Critical">Critical</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="assignedBy"
                    label="Assigned By"
                    rules={[{ required: true, message: 'Please select who assigned this task!' }]}
                >
                    <Select showSearch optionFilterProp="children" placeholder="Select who assigned this task">
                        {ASSIGNED_BY_LIST.map(name => (
                            <Option key={name} value={name}>{name}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) => prevValues.assignedBy !== currentValues.assignedBy}
                >
                    {({ getFieldValue }) =>
                        getFieldValue('assignedBy') === 'Others' ? (
                            <Form.Item
                                name="otherAssignedBy"
                                label="Other Assigner Name"
                                rules={[{ required: true, message: 'Please input the assigner name!' }]}
                            >
                                <Input placeholder="Enter assigner name" />
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>

                <Form.Item
                    name="assignee"
                    label="Assignee"
                    rules={[{ required: true, message: 'Please select an assignee!' }]}
                >
                    <Select showSearch optionFilterProp="children">
                        {users.map(u => (
                            <Option key={u.id} value={u.id}>{u.name}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true, message: 'Please select a status!' }]}
                >
                    <Select>
                        <Option value="Not Started">Not Started</Option>
                        <Option value="In Progress">In Progress</Option>
                        <Option value="Completed">Completed</Option>
                        <Option value="On Hold">On Hold</Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddTaskModal;
