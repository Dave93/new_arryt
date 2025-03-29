"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { KeyRound } from "lucide-react";

const codeFormSchema = z.object({
  code: z.string().min(4, { message: "Код должен содержать не менее 4 символов" }),
});

type CodeFormValues = z.infer<typeof codeFormSchema>;

interface CodeFormProps {
  onSubmit: (values: { code: string }) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
  phone: string;
}

export function CodeForm({ onSubmit, onBack, isLoading, phone }: CodeFormProps) {
  const form = useForm<CodeFormValues>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: {
      code: "",
    },
  });

  const handleSubmit = async (values: CodeFormValues) => {
    await onSubmit(values);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Подтверждение</CardTitle>
        <CardDescription>
          Введите код, отправленный на номер {phone}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Код подтверждения</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Введите код" 
                      {...field} 
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col space-y-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Проверка..." : "Войти"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={onBack}
                disabled={isLoading}
              >
                Изменить номер
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Не получили код? Попробуйте еще раз через 60 секунд
        </p>
      </CardFooter>
    </Card>
  );
} 