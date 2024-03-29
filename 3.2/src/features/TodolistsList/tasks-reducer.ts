import {
    addTodolistTC, fetchTodolistsTC,
    removeTodolistTC,
} from './todolists-reducer'
import {
    TaskPriorities,
    TaskStatuses,
    TaskType,
    todolistsAPI,
    UpdateTaskModelType
} from '../../api/todolists-api'
import {AppRootStateType} from '../../app/store'
import {setAppStatusAC} from '../../app/app-reducer'
import {handleServerAppError, handleServerNetworkError} from '../../utils/error-utils'
import {createAsyncThunk, createSlice, PayloadAction} from "@reduxjs/toolkit";


export const fetchTasksTC = createAsyncThunk('task/fetchTasksTC', async (todolistId: string, thunkAPI) => {
    thunkAPI.dispatch(setAppStatusAC({status: 'loading'}))
    const res = await todolistsAPI.getTasks(todolistId)
    const tasks = res.data.items
    thunkAPI.dispatch(setAppStatusAC({status: 'succeeded'}))
    return {tasks, todolistId}
})

export const removeTaskTC = createAsyncThunk('task/removeTaskTC', (param: { taskId: string, todolistId: string }, thunkAPI) => {
    return todolistsAPI.deleteTask(param.todolistId, param.taskId)
        .then(res => ({taskId: param.taskId, todolistId: param.todolistId}))
})

export const addTaskTC = createAsyncThunk('task/addTaskTC',
    async (param: { title: string, todolistId: string }, {dispatch, rejectWithValue}) => {
        dispatch(setAppStatusAC({status: 'loading'}))
        try {
            const res = await todolistsAPI.createTask(param.todolistId, param.title)

            if (res.data.resultCode === 0) {
                dispatch(setAppStatusAC({status: 'succeeded'}))
                return res.data.data.item
            } else {
                handleServerAppError(res.data, dispatch);
                return rejectWithValue({})
            }
        } catch (error) {
            handleServerNetworkError(error, dispatch)
            return rejectWithValue({})
        }
    })

export const updateTaskTC = createAsyncThunk('task/updateTaskTC',
    async (param: { taskId: string, model: UpdateDomainTaskModelType, todolistId: string }, {
        dispatch,
        rejectWithValue,
        getState}) => {
        const state = getState() as AppRootStateType

        const task = state.tasks[param.todolistId].find(t => t.id === param.taskId)
        if (!task) {
            return  rejectWithValue('task not found in the state')
        }

        const apiModel: UpdateTaskModelType = {
            deadline: task.deadline,
            description: task.description,
            priority: task.priority,
            startDate: task.startDate,
            title: task.title,
            status: task.status,
            ...param.model
        }

        const res = await todolistsAPI.updateTask(param.todolistId, param.taskId, apiModel)
        try {
            if (res.data.resultCode === 0) {
                return param;
            } else {
                handleServerAppError(res.data, dispatch);
                return rejectWithValue({})
            }
        } catch (error) {
            handleServerNetworkError(error, dispatch);
            return rejectWithValue({})
        }
    })

const slice = createSlice({
        name: 'task',
        initialState: {} as TasksStateType,
        reducers: {
        },
        extraReducers: (builder) => {
            builder.addCase(addTodolistTC.fulfilled, (state, action) => {
                state[action.payload.todolist.id] = []
            })
            builder.addCase(removeTodolistTC.fulfilled, (state, action) => {
                delete state[action.payload.todolistId]
            })
            builder.addCase(fetchTodolistsTC.fulfilled, (state, action) => {
                action.payload.todolists.forEach(t => state[t.id] = [])
            })
            builder.addCase(fetchTasksTC.fulfilled, (state, action) => {
                state[action.payload.todolistId] = action.payload.tasks
            })
            builder.addCase(removeTaskTC.fulfilled, (state, action) => {
                const tasks = state[action.payload.todolistId]
                const index = tasks.findIndex(t => t.id === action.payload.taskId)
                state[action.payload.todolistId].splice(index, 1)
            })
            builder.addCase(addTaskTC.fulfilled, (state, action) => {
                state[action.payload.todoListId].unshift(action.payload)
            })
            builder.addCase(updateTaskTC.fulfilled, (state, action) => {
                const tasks = state[action.payload.todolistId]
                const index = tasks.findIndex(t => t.id === action.payload.taskId)
                tasks[index] = {...tasks[index], ...action.payload.model}
            })
        }
    }
)

export const tasksReducer = slice.reducer


// types
export type UpdateDomainTaskModelType = {
    title?: string
    description?: string
    status?: TaskStatuses
    priority?: TaskPriorities
    startDate?: string
    deadline?: string
}
export type TasksStateType = {
    [key: string]: Array<TaskType>
}

