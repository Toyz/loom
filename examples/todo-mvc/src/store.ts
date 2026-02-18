import { CollectionStore } from "@toyz/loom";
import { LocalAdapter, Reactive, service, LoomEvent, bus } from "@toyz/loom";

export type FilterType = "all" | "active" | "completed";

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
}

/** Emitted when a specific todo changes — TodoItem matches by id */
export class TodoChanged extends LoomEvent {
    constructor(public readonly todo: Todo) { super(); }
}

@service()
export class TodoStore {
    todos = new CollectionStore<Todo>([], {
        key: "loom-todomvc-v3",
        storage: new LocalAdapter(),
    });

    filter = new Reactive<FilterType>("all");

    // Plain getters
    get visibleTodos(): Todo[] {
        const f = this.filter.value;
        const list = this.todos.value;
        if (f === "active") return list.filter(t => !t.completed);
        if (f === "completed") return list.filter(t => t.completed);
        return list;
    }

    get activeCount(): number {
        return this.todos.value.reduce((acc, t) => acc + (t.completed ? 0 : 1), 0);
    }

    get completedCount(): number {
        return this.todos.value.length - this.activeCount;
    }

    get allCompleted(): boolean {
        return this.todos.value.length > 0 && this.activeCount === 0;
    }

    // Actions — each emits TodoChanged for affected items
    add(text: string) {
        const t = text.trim();
        if (!t) return;
        const todo: Todo = { id: crypto.randomUUID(), text: t, completed: false };
        this.todos.set(prev => [...prev, todo]);
        bus.emit(new TodoChanged(todo));
    }

    toggle(id: string) {
        this.todos.set(prev =>
            prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t),
        );
        const todo = this.todos.value.find(t => t.id === id);
        if (todo) bus.emit(new TodoChanged(todo));
    }

    destroy(id: string) {
        const todo = this.todos.value.find(t => t.id === id);
        this.todos.set(prev => prev.filter(t => t.id !== id));
        if (todo) bus.emit(new TodoChanged({ ...todo }));
    }

    updateText(id: string, text: string) {
        this.todos.set(prev =>
            prev.map(t => t.id === id ? { ...t, text } : t),
        );
        const todo = this.todos.value.find(t => t.id === id);
        if (todo) bus.emit(new TodoChanged(todo));
    }

    toggleAll(completed: boolean) {
        this.todos.set(prev => prev.map(t => ({ ...t, completed })));
        for (const todo of this.todos.value) {
            bus.emit(new TodoChanged(todo));
        }
    }

    clearCompleted() {
        this.todos.set(prev => prev.filter(t => !t.completed));
    }

    setFilter(f: FilterType) {
        this.filter.set(f);
    }
}
